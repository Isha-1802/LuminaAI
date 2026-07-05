import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    db = AsyncIOMotorClient("mongodb://localhost:27017")["lumina"]
    user = await db.users.find_one({"role": "interviewer"})
    if user:
        print(f"Found user: {user.get('email')}")
        print(f"Headline: {user.get('headline')}")
        print(f"About: {user.get('about')}")
    else:
        print("No interviewer found")

asyncio.run(main())
