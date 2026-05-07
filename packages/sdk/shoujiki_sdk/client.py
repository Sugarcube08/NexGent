import requests


class ShoujikiClient:
    def __init__(self, base_url="http://localhost:8000", token=None):
        self.base_url = base_url
        self.token = token

    def deploy_agent(
        self,
        agent_id,
        name,
        description,
        input_price=0.01,
        output_price=0.05,
        code="",
        requirements=[],
        entrypoint="main.py",
    ):
        headers = {}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"

        data = {
            "id": agent_id,
            "name": name,
            "description": description,
            "price_per_million_input_tokens": input_price,
            "price_per_million_output_tokens": output_price,
            "files": {entrypoint: code},
            "requirements": requirements,
            "entrypoint": entrypoint,
        }
        response = requests.post(
            f"{self.base_url}/agents/deploy", json=data, headers=headers
        )
        response.raise_for_status()
        return response.json()

    def deploy_codebase(
        self,
        agent_id,
        name,
        description,
        input_price=0.01,
        output_price=0.05,
        zip_bytes=None,
        entrypoint="main.py",
    ):
        headers = {}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"

        files = {"file": ("codebase.zip", zip_bytes, "application/zip")}
        data = {
            "id": agent_id,
            "name": name,
            "description": description,
            "price_per_million_input_tokens": str(input_price),
            "price_per_million_output_tokens": str(output_price),
            "entrypoint": entrypoint,
        }

        response = requests.post(
            f"{self.base_url}/agents/deploy/zip",
            files=files,
            data=data,
            headers=headers,
        )
        response.raise_for_status()
        return response.json()
