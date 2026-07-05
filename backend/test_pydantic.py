from pydantic import BaseModel, Field
from typing import Optional

class UserProfileInput(BaseModel):
    headline: Optional[str] = Field(default=None, max_length=120)
    about: Optional[str] = Field(default=None, max_length=1000)
    skills: Optional[list] = None

# Simulate what fastapi does with JSON payload
data = {"headline": "foo", "about": None}
m = UserProfileInput(**data)
print(m.model_dump(exclude_unset=True))
