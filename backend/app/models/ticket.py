from sqlalchemy import Column, Integer, String, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base
import enum

class TicketStatus(str, enum.Enum):
    RECEIVED = "Reçu"
    IN_PROGRESS = "En cours de traitement"
    RESOLVED = "Résolu"
    CLOSED = "Fermé"

class TicketPriority(str, enum.Enum):
    CRITICAL = "Critique"
    URGENT = "Urgent"
    IMPORTANT = "Important"
    NORMAL = "Normal"

class Ticket(Base):
    __tablename__ = "tickets"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text)
    status = Column(Enum(TicketStatus), default=TicketStatus.RECEIVED)
    priority = Column(Enum(TicketPriority), default=TicketPriority.NORMAL)
    category = Column(String)  # facturation, panne, support technique
    client_id = Column(Integer, ForeignKey("users.id"))
    assigned_agent_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    
    client = relationship("User", foreign_keys=[client_id])
    assigned_agent = relationship("User", foreign_keys=[assigned_agent_id])