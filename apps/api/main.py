from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Depends, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from backend.db.session import engine, Base, get_db
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.modules.auth.routes import router as auth_router
from backend.modules.agents.routes import router as agents_router
from backend.modules.billing.routes import router as billing_router
from backend.modules.workflows.routes import router as workflows_router
from backend.modules.marketplace.routes import router as marketplace_router
from backend.modules.protocols.routes import router as protocol_router
from backend.modules.auth.middleware import X402PaymentMiddleware
from arq import create_pool
from arq.connections import RedisSettings
import logging
import json
import asyncio
from backend.core.config import (
    REDIS_QUEUE_HOST,
    REDIS_QUEUE_PORT,
    REDIS_PUBSUB_HOST,
    REDIS_PUBSUB_PORT,
    REDIS_PASSWORD,
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize Redis connections
    app.state.redis_queue = await create_pool(
        RedisSettings(
            host=REDIS_QUEUE_HOST, port=REDIS_QUEUE_PORT, password=REDIS_PASSWORD
        )
    )
    app.state.redis_pubsub = await create_pool(
        RedisSettings(
            host=REDIS_PUBSUB_HOST, port=REDIS_PUBSUB_PORT, password=REDIS_PASSWORD
        )
    )
    logger.info("Redis connections initialized.")

    # Startup: Ensure tables exist
    max_retries = 5
    for i in range(max_retries):
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
                
                # --- EXHAUSTIVE SCHEMA MIGRATION ---
                # This ensures any legacy DB on Render is patched with all required columns
                try:
                    from sqlalchemy import text
                    
                    migrations = [
                        # User Wallets
                        ("user_wallets", "balance", "FLOAT DEFAULT 0.0"),
                        ("user_wallets", "allowances", "JSON DEFAULT '{}'"),
                        
                        # Agents
                        ("agents", "name", "VARCHAR"),
                        ("agents", "description", "TEXT"),
                        ("agents", "versions", "JSON DEFAULT '[]'"),
                        ("agents", "current_version", "VARCHAR DEFAULT 'v1'"),
                        ("agents", "price_per_million_input_tokens", "FLOAT DEFAULT 0.01"),
                        ("agents", "price_per_million_output_tokens", "FLOAT DEFAULT 0.05"),
                        ("agents", "creator_wallet", "VARCHAR"),
                        ("agents", "env_vars", "JSON DEFAULT '{}'"),
                        ("agents", "total_runs", "FLOAT DEFAULT 0.0"),
                        ("agents", "successful_runs", "FLOAT DEFAULT 0.0"),
                        ("agents", "balance", "FLOAT DEFAULT 0.0"),
                        ("agents", "total_earnings", "FLOAT DEFAULT 0.0"),
                        ("agents", "lineage_parent_id", "VARCHAR"),
                        
                        # Tasks
                        ("tasks", "agent_id", "VARCHAR"),
                        ("tasks", "user_wallet", "VARCHAR"),
                        ("tasks", "input_data", "TEXT"),
                        ("tasks", "result", "TEXT"),
                        ("tasks", "status", "VARCHAR DEFAULT 'queued'"),
                        ("tasks", "depth", "FLOAT DEFAULT 0.0"),
                        ("tasks", "input_tokens", "FLOAT DEFAULT 0.0"),
                        ("tasks", "output_tokens", "FLOAT DEFAULT 0.0"),
                        ("tasks", "poae_hash", "VARCHAR"),
                        
                        # Workflows
                        ("workflows", "name", "VARCHAR"),
                        ("workflows", "creator_wallet", "VARCHAR"),
                        ("workflows", "nodes", "JSON DEFAULT '[]'"),
                        ("workflows", "edges", "JSON DEFAULT '[]'"),
                        
                        # Workflow Runs
                        ("workflow_runs", "workflow_id", "VARCHAR"),
                        ("workflow_runs", "user_wallet", "VARCHAR"),
                        ("workflow_runs", "status", "VARCHAR DEFAULT 'queued'"),
                        ("workflow_runs", "max_budget", "FLOAT DEFAULT 0.0"),
                        ("workflow_runs", "total_spend", "FLOAT DEFAULT 0.0"),
                        ("workflow_runs", "active_nodes", "JSON DEFAULT '[]'"),
                        ("workflow_runs", "completed_steps", "JSON DEFAULT '{}'"),
                        ("workflow_runs", "results", "JSON"),
                    ]
                    
                    for table, column, col_type in migrations:
                        try:
                            await conn.execute(text(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {column} {col_type}"))
                        except Exception as e:
                            logger.warning(f"Migration failed for {table}.{column}: {e}")

                except Exception as migrate_err:
                    logger.warning(f"Global migration skip/failed: {migrate_err}")

            logger.info("Database verified and exhaustive migration complete.")
            break
        except Exception as e:
            if i < max_retries - 1:
                await asyncio.sleep(2)
            else:
                logger.error(f"DB Connection failed: {e}")
    yield
    await engine.dispose()
    logger.info("Database connection closed")


app = FastAPI(title="Shoujiki API", lifespan=lifespan)

app.add_middleware(X402PaymentMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred."},
    )


app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(agents_router, prefix="/agents", tags=["agents"])
app.include_router(billing_router, prefix="/billing", tags=["billing"])
app.include_router(workflows_router, prefix="/workflows", tags=["workflows"])
app.include_router(marketplace_router, prefix="/marketplace", tags=["marketplace"])
app.include_router(protocol_router, prefix="/protocol", tags=["protocol"])


@app.websocket("/ws/telemetry")
async def websocket_telemetry(websocket: WebSocket):
    await websocket.accept()
    redis = app.state.redis_pubsub
    pubsub = redis.pubsub()
    await pubsub.psubscribe("task:*", "workflow:*", "telemetry:*")
    try:
        async for message in pubsub.listen():
            if message["type"] == "pmessage":
                channel = message["channel"].decode("utf-8")
                data = message["data"].decode("utf-8")
                payload = {"channel": channel, "data": json.loads(data) if data.startswith("{") else data}
                await websocket.send_text(json.dumps(payload))
    except WebSocketDisconnect:
        pass
    finally:
        await pubsub.close()

@app.websocket("/ws/tasks/{task_id}")
async def websocket_endpoint(websocket: WebSocket, task_id: str):
    await websocket.accept()
    redis = app.state.redis_pubsub
    pubsub = redis.pubsub()
    await pubsub.subscribe(f"task:{task_id}")
    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                data = message["data"].decode("utf-8")
                await websocket.send_text(data)
                msg_json = json.loads(data)
                if msg_json.get("status") in ["completed", "failed", "settled"]:
                    break
    except WebSocketDisconnect:
        pass
    finally:
        await pubsub.close()


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.get("/config")
async def get_config():
    from backend.modules.billing.service import PLATFORM_WALLET
    return {"platform_wallet": PLATFORM_WALLET}


@app.get("/stats")
async def get_stats(db: AsyncSession = Depends(get_db)):
    from backend.db.models.models import Agent, Task
    from sqlalchemy import func

    agent_count = await db.execute(select(func.count(Agent.id)))
    task_count = await db.execute(select(func.count(Task.id)))
    volume_res = await db.execute(select(func.sum(Agent.total_earnings)))

    return {
        "active_agents": agent_count.scalar() or 0,
        "total_executions": task_count.scalar() or 0,
        "total_volume": volume_res.scalar() or 0.0,
    }


@app.get("/")
async def root():
    return {"message": "Welcome to Shoujiki API", "version": "1.0.0"}
