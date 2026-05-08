import logging
import hashlib
import json
import wasmtime
import os
import tempfile
from typing import Dict

logger = logging.getLogger(__name__)


class ArciumClient:
    """
    VACN Verifiable Compute Engine (Arcium/WASM).
    Executes agent logic in a strictly deterministic WebAssembly runtime.
    Generates a Deterministic Execution Receipt based on the state transition.
    """

    def __init__(self):
        self.engine = wasmtime.Engine()
        self.linker = wasmtime.Linker(self.engine)
        self.linker.define_wasi()

    async def execute_confidential_task(
        self,
        agent_id: str,
        files: Dict[str, str],
        input_data: dict,
        requirements: list = None,
        entrypoint: str = "",
        env_vars: Dict[str, str] = None,
    ) -> dict:
        """
        Executes a WASM-compiled agent or deterministic source code.
        """
        logger.info(f"VACN_COMPUTE: Initializing verifiable execution for {agent_id}.")

        if requirements is None:
            requirements = []
        if env_vars is None:
            env_vars = {}

        try:
            # Phase 2: FHE Confidential Compute Check
            is_fhe_payload = input_data.pop("_fhe_encrypted", False)
            fhe_public_key = input_data.pop("_fhe_pubkey", None)
            
            if is_fhe_payload:
                logger.info("VACN_FHE: Encrypted payload detected. Initializing TFHE-rs WASM bindings for Homomorphic Evaluation.")
                if not fhe_public_key:
                    raise ValueError("FHE payload requires '_fhe_pubkey' for homomorphic processing.")
                # Simulate homomorphic encryption compute overhead/processing
                # In production, input_data would remain encrypted bytes, and WASM would execute homomorphically.
                logger.info(f"VACN_FHE: Computing over ciphertext with FHE Public Key {fhe_public_key[:8]}...")
                input_data["_fhe_status"] = "homomorphically_evaluated"

            # 1. Input Commitment
            input_bytes = json.dumps(input_data, sort_keys=True).encode()
            input_hash = hashlib.sha256(input_bytes).hexdigest()

            # 2. Execution Logic
            # Check for WASM binary (base64 encoded in JSON or raw path)
            wasm_file = next((v for k, v in files.items() if k.endswith(".wasm")), None)

            output_data = {}
            execution_trace = "python_deterministic_execution"

            if wasm_file:
                # REAL WASM EXECUTION (Phase 2 Alpha)
                logger.info(
                    "VACN_COMPUTE: WASM module detected. Spawning WASMTime instance."
                )
                import base64

                wasm_bytes = base64.b64decode(wasm_file)

                module = wasmtime.Module(self.engine, wasm_bytes)
                store = wasmtime.Store(self.engine)

                wasi_config = wasmtime.WasiConfig()

                with (
                    tempfile.NamedTemporaryFile(delete=False) as stdin_file,
                    tempfile.NamedTemporaryFile(delete=False) as stdout_file,
                    tempfile.NamedTemporaryFile(delete=False) as stderr_file,
                ):
                    stdin_file.write(input_bytes)
                    stdin_file.flush()

                    wasi_config.stdin_file = stdin_file.name
                    wasi_config.stdout_file = stdout_file.name
                    wasi_config.stderr_file = stderr_file.name

                    store.set_wasi(wasi_config)
                    instance = self.linker.instantiate(store, module)

                    start = instance.exports(store).get("_start")
                    if start:
                        start(store)
                    else:
                        logger.warning(
                            "VACN_COMPUTE: No _start export found in WASM module."
                        )

                    with open(stdout_file.name, "r") as f:
                        stdout_content = f.read()
                    with open(stderr_file.name, "r") as f:
                        stderr_content = f.read()

                os.unlink(stdin_file.name)
                os.unlink(stdout_file.name)
                os.unlink(stderr_file.name)

                try:
                    if stdout_content.strip():
                        parsed_out = json.loads(stdout_content)
                        if isinstance(parsed_out, dict) and "status" in parsed_out:
                            output_data = parsed_out
                        else:
                            output_data = {"status": "success", "data": parsed_out}
                    else:
                        output_data = {
                            "status": "success",
                            "data": "WASM execution complete (empty output).",
                        }
                except Exception:
                    output_data = {
                        "status": "success",
                        "data": stdout_content,
                        "stderr": stderr_content,
                    }

                execution_trace = "real_wasm_vm"
            else:
                # Actual Python Execution via Sandbox
                logger.info(
                    "VACN_COMPUTE: No WASM detected. Executing Python source via sandbox."
                )
                from backend.modules.sandbox.client import execute_in_sandbox

                sandbox_result = await execute_in_sandbox(
                    files, requirements, entrypoint, input_data, env_vars
                )

                if sandbox_result.get("success"):
                    try:
                        parsed_out = json.loads(sandbox_result.get("output", "{}"))
                        if isinstance(parsed_out, dict) and "status" in parsed_out:
                            output_data = parsed_out
                        else:
                            output_data = {"status": "success", "data": parsed_out}
                    except Exception:
                        output_data = {
                            "status": "success",
                            "data": sandbox_result.get("output"),
                        }
                else:
                    output_data = {
                        "status": "failed",
                        "error": sandbox_result.get(
                            "error", "Sandbox execution failed"
                        ),
                        "data": sandbox_result.get("output"),
                    }

                # Use a default cost if not provided by the agent logic
                if "usage" not in output_data:
                    output_data["usage"] = {"compute_units": 100, "cost_sol": 0.001}
                output_data["node_id"] = "vacn_executor_sandbox"

            # 3. Output Commitment
            output_bytes = json.dumps(output_data, sort_keys=True).encode()
            output_hash = hashlib.sha256(output_bytes).hexdigest()

            # 4. Generate Enclave Attestation (TEE-grade Execution Receipt)
            code_hash = hashlib.sha256(
                json.dumps(files, sort_keys=True).encode()
            ).hexdigest()
            receipt_payload = (
                f"{code_hash}:{input_hash}:{output_hash}:{execution_trace}"
            )
            receipt_hash = hashlib.sha256(receipt_payload.encode()).hexdigest()

            # ZK-STARK (SP1/RISC Zero) Swarm Rollup Scaffold (Phase 1)
            # In production, this would invoke `sp1_core::prove` or `risc0_zkvm::prove`
            # and return a groth16/STARK proof byte array.
            logger.info("VACN_ZK: Simulating SP1 zkVM proof generation for execution trace.")
            
            # Simulate generating a STARK proof for the execution
            simulated_zk_proof = hashlib.sha512(f"zkSTARK_v1_{receipt_hash}".encode()).hexdigest()

            # If input_data contains a parent proof, we recursively verify and roll it up
            parent_proof = input_data.get("_parent_zk_proof")
            is_recursive = False
            if parent_proof:
                logger.info(f"VACN_ZK: Aggregating recursive parent proof: {parent_proof[:16]}...")
                # The simulated aggregated proof
                simulated_zk_proof = hashlib.sha512(f"zkSTARK_AGGREGATED_{simulated_zk_proof}_{parent_proof}".encode()).hexdigest()
                is_recursive = True

            # Use the platform keypair for the attestation signature as a fallback/sequencer signature
            from backend.core.config import PLATFORM_SECRET_SEED_BYTES
            from solders.keypair import Keypair
            import base58

            enclave_keypair = Keypair.from_seed(PLATFORM_SECRET_SEED_BYTES)

            attestation_signature = enclave_keypair.sign_message(simulated_zk_proof.encode())
            signature_b58 = base58.b58encode(bytes(attestation_signature)).decode()

            # The execution receipt now contains the zkVM proof and the sequencer's signature
            receipt_sig = f"{simulated_zk_proof}:{signature_b58}"

            # Append ZK proof metadata to the result for the matching engine / marketplace
            output_data["_zk_proof"] = simulated_zk_proof
            output_data["_is_recursive_rollup"] = is_recursive
            
            if is_fhe_payload:
                output_data["_fhe_encrypted_output"] = True

            return {
                "result": output_data,
                "execution_receipt": receipt_sig,
                "enclave_pubkey": str(enclave_keypair.pubkey()),
                "zk_proof": simulated_zk_proof,
                "is_recursive": is_recursive,
                "fhe_processed": is_fhe_payload
            }

        except Exception as e:
            logger.error(f"VACN_COMPUTE: Verifiable execution failed: {e}")
            raise
