import asyncio
import httpx

async def main():
    async with httpx.AsyncClient(base_url="http://localhost:8000/api") as client:
        # Register a test user
        import uuid
        email = f"test_{uuid.uuid4().hex[:6]}@example.com"
        print(f"Registering {email}")
        res = await client.post("/auth/register", json={
            "email": email,
            "password": "Password123!",
            "name": "Test User",
            "role": "interviewer"
        })
        print("Register:", res.status_code)
        token = res.json()["token"]
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # Put profile
        payload = {
            "headline": "My Test Headline",
            "about": "Testing about",
            "current_company": "Test Co",
            "years_of_experience": 5,
            "skills": ["Python", "React"],
            "linkedin_url": "https://linkedin.com/in/test",
            "is_available": True,
            "available_slots": ["2026-07-06T09:00:00.000Z"]
        }
        res = await client.put("/profiles/me", json=payload, headers=headers)
        print("PUT Profile:", res.status_code)
        
        # Fetch auth/me
        res = await client.get("/auth/me", headers=headers)
        print("GET auth/me:", res.status_code)
        user = res.json()
        print("User headline:", user.get("headline"))
        print("User about:", user.get("about"))

asyncio.run(main())
