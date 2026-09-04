from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

class UserSearchResponse(BaseModel):
    id: int
    username: str
    email: str
    relationship_status: str = "none"  # "none", "pending_sent", "pending_received", "accepted"
    request_id: Optional[int] = None
    
    model_config = ConfigDict(from_attributes=True)

class FriendUser(BaseModel):
    id: int
    username: str
    email: str
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class FriendshipResponse(BaseModel):
    id: int
    user_id: int
    friend_id: int
    status: str
    created_at: datetime
    
    # We populate these in the router based on context
    friend_details: Optional[FriendUser] = None
    
    model_config = ConfigDict(from_attributes=True)

class RequestsSummaryResponse(BaseModel):
    incoming: List[FriendshipResponse]
    outgoing: List[FriendshipResponse]

