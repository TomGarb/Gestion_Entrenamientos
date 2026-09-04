from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from typing import List

from app.database import get_db
from app.models.user import User
from app.models.friendship import Friendship
from app.api.deps import get_current_user
from app.schemas.community import (
    UserSearchResponse,
    FriendUser,
    FriendshipResponse,
    RequestsSummaryResponse,
)
from app.services.notification_service import notify_friend_request, notify_friend_accepted, notify_friend_rejected

router = APIRouter(prefix="/api/community", tags=["community"])
users_router = APIRouter(prefix="/api/users", tags=["users"])


def _execute_user_search(q: str, db: Session, current_user: User) -> List[UserSearchResponse]:
    """Busca usuarios por coincidencia EXACTA (case-insensitive) de username o email para cuidar la privacidad."""
    if not q or len(q.strip()) < 2:
        return []
    
    clean_q = q.strip().lower()
    
    # Coincidencia exacta (case-insensitive) con username o email
    users = db.query(User).filter(
        or_(
            func.lower(User.username) == clean_q,
            func.lower(User.email) == clean_q
        ),
        User.id != current_user.id
    ).all()
    
    results = []
    for u in users:
        # Consultar estado de relación con current_user
        rel = db.query(Friendship).filter(
            or_(
                and_(Friendship.user_id == current_user.id, Friendship.friend_id == u.id),
                and_(Friendship.user_id == u.id, Friendship.friend_id == current_user.id)
            )
        ).first()
        
        status_str = "none"
        req_id = None
        
        if rel:
            req_id = rel.id
            if rel.status == "accepted":
                status_str = "accepted"
            elif rel.status == "pending":
                if rel.user_id == current_user.id:
                    status_str = "pending_sent"
                else:
                    status_str = "pending_received"
        
        results.append(UserSearchResponse(
            id=u.id,
            username=u.username,
            email=u.email,
            relationship_status=status_str,
            request_id=req_id
        ))
        
    return results


@router.get("/search", response_model=List[UserSearchResponse])
def search_community_users(q: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return _execute_user_search(q, db, current_user)


@users_router.get("/search", response_model=List[UserSearchResponse])
def search_users_alias(q: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return _execute_user_search(q, db, current_user)


@router.get("/friends", response_model=List[FriendshipResponse])
def get_friends(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Obtiene la lista de amigos aceptados de forma bidireccional."""
    friendships = db.query(Friendship).filter(
        Friendship.status == "accepted",
        or_(
            Friendship.user_id == current_user.id,
            Friendship.friend_id == current_user.id
        )
    ).order_by(Friendship.updated_at.desc()).all()
    
    results = []
    for f in friendships:
        friend_user = f.addressee if f.user_id == current_user.id else f.requester
        if not friend_user:
            continue
            
        resp = FriendshipResponse(
            id=f.id,
            user_id=f.user_id,
            friend_id=f.friend_id,
            status=f.status,
            created_at=f.created_at,
            friend_details=FriendUser(
                id=friend_user.id,
                username=friend_user.username,
                email=friend_user.email,
                created_at=friend_user.created_at
            )
        )
        results.append(resp)
        
    return results


@router.get("/requests", response_model=RequestsSummaryResponse)
def get_requests(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Obtiene las solicitudes entrantes (recibidas) y salientes (enviadas) pendientes."""
    incoming_raw = db.query(Friendship).filter(
        Friendship.friend_id == current_user.id,
        Friendship.status == "pending"
    ).order_by(Friendship.created_at.desc()).all()
    
    outgoing_raw = db.query(Friendship).filter(
        Friendship.user_id == current_user.id,
        Friendship.status == "pending"
    ).order_by(Friendship.created_at.desc()).all()
    
    incoming = []
    for f in incoming_raw:
        if f.requester:
            incoming.append(FriendshipResponse(
                id=f.id,
                user_id=f.user_id,
                friend_id=f.friend_id,
                status=f.status,
                created_at=f.created_at,
                friend_details=FriendUser(
                    id=f.requester.id,
                    username=f.requester.username,
                    email=f.requester.email,
                    created_at=f.requester.created_at
                )
            ))
            
    outgoing = []
    for f in outgoing_raw:
        if f.addressee:
            outgoing.append(FriendshipResponse(
                id=f.id,
                user_id=f.user_id,
                friend_id=f.friend_id,
                status=f.status,
                created_at=f.created_at,
                friend_details=FriendUser(
                    id=f.addressee.id,
                    username=f.addressee.username,
                    email=f.addressee.email,
                    created_at=f.addressee.created_at
                )
            ))
            
    return RequestsSummaryResponse(incoming=incoming, outgoing=outgoing)


@router.post("/request/{target_id}")
def send_request(target_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Envía una solicitud de amistad a otro usuario."""
    if target_id == current_user.id:
        raise HTTPException(status_code=400, detail="No puedes enviarte una solicitud a ti mismo.")
        
    target_user = db.query(User).filter(User.id == target_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")
        
    # Verificar si ya existe alguna relación en cualquier dirección
    existing = db.query(Friendship).filter(
        or_(
            and_(Friendship.user_id == current_user.id, Friendship.friend_id == target_id),
            and_(Friendship.user_id == target_id, Friendship.friend_id == current_user.id)
        )
    ).first()
    
    if existing:
        if existing.status == "pending":
            if existing.user_id == current_user.id:
                raise HTTPException(status_code=400, detail="Ya enviaste una solicitud a este usuario.")
            else:
                # El otro usuario ya le había enviado una solicitud a current_user -> autoaceptamos
                existing.status = "accepted"
                db.commit()
                return {"detail": "Amistad aceptada automáticamente.", "request_id": existing.id, "status": "accepted"}
        elif existing.status == "accepted":
            raise HTTPException(status_code=400, detail="Ya son amigos.")
        else:
            # Si estaba rechazada, reabrirla
            existing.status = "pending"
            existing.user_id = current_user.id
            existing.friend_id = target_id
            db.commit()
            notify_friend_request(db, current_user.id, target_id, existing.id)
            return {"detail": "Solicitud enviada nuevamente.", "request_id": existing.id, "status": "pending"}
            
    new_request = Friendship(user_id=current_user.id, friend_id=target_id, status="pending")
    db.add(new_request)
    db.commit()
    db.refresh(new_request)
    notify_friend_request(db, current_user.id, target_id, new_request.id)
    return {"detail": "Solicitud enviada correctamente.", "request_id": new_request.id, "status": "pending"}


@router.post("/accept/{request_id}")
def accept_request(request_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Acepta una solicitud de amistad entrante."""
    req = db.query(Friendship).filter(
        Friendship.id == request_id, 
        Friendship.friend_id == current_user.id,
        Friendship.status == "pending"
    ).first()
    
    if not req:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada o no autorizada.")
        
    req.status = "accepted"
    db.commit()
    notify_friend_accepted(db, current_user.id, req.user_id)
    return {"detail": "Solicitud de amistad aceptada.", "status": "accepted"}


@router.post("/reject/{request_id}")
def reject_request(request_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Rechaza una solicitud de amistad entrante."""
    req = db.query(Friendship).filter(
        Friendship.id == request_id, 
        Friendship.friend_id == current_user.id,
        Friendship.status == "pending"
    ).first()
    
    if not req:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada o no autorizada.")
        
    requester_id = req.user_id
    db.delete(req)
    db.commit()
    notify_friend_rejected(db, current_user.id, requester_id)
    return {"detail": "Solicitud rechazada."}


@router.post("/cancel/{request_id}")
def cancel_request(request_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Cancela una solicitud de amistad enviada previamente."""
    req = db.query(Friendship).filter(
        Friendship.id == request_id, 
        Friendship.user_id == current_user.id,
        Friendship.status == "pending"
    ).first()
    
    if not req:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada o no autorizada.")
        
    db.delete(req)
    db.commit()
    return {"detail": "Solicitud cancelada con éxito."}


@router.delete("/friend/{friend_id}")
def remove_friend(friend_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Elimina una relación de amistad existente."""
    rel = db.query(Friendship).filter(
        Friendship.status == "accepted",
        or_(
            and_(Friendship.user_id == current_user.id, Friendship.friend_id == friend_id),
            and_(Friendship.user_id == friend_id, Friendship.friend_id == current_user.id)
        )
    ).first()
    
    if not rel:
        raise HTTPException(status_code=404, detail="Relación de amistad no encontrada.")
        
    db.delete(rel)
    db.commit()
    return {"detail": "Amigo eliminado correctamente."}

