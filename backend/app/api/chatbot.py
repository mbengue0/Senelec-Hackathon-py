from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models.user import User
from ..models.ticket import Ticket, TicketStatus, TicketPriority
from ..schemas.chatbot import ChatMessage, ChatResponse, ConversationState
from ..services.chatbot import chatbot_service, IntentType
from ..api.auth import get_current_user
import uuid

router = APIRouter()

# Store active conversations in memory (use Redis in production)
active_conversations = {}

@router.post("/start", response_model=ChatResponse)
async def start_conversation(current_user: User = Depends(get_current_user)):
    """Start a new chat conversation"""
    conversation_id = str(uuid.uuid4())
    
    active_conversations[conversation_id] = {
        "user_id": current_user.id,
        "messages": [],
        "intent": None,
        "needs_agent": False
    }
    
    return ChatResponse(
        conversation_id=conversation_id,
        message=chatbot_service.responses["greeting"],
        intent=None,
        needs_agent=False
    )

@router.post("/message", response_model=ChatResponse)
async def send_message(
    message: ChatMessage,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Process a user message"""
    conv_id = message.conversation_id
    
    if conv_id not in active_conversations:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    conversation = active_conversations[conv_id]
    
    # Add user message to conversation
    conversation["messages"].append({
        "sender": "user",
        "text": message.text,
        "timestamp": datetime.utcnow()
    })
    
    # Detect intent
    intent = chatbot_service.detect_intent(message.text)
    conversation["intent"] = intent
    
    # Check if human agent is needed
    needs_agent = chatbot_service.needs_human_agent(message.text, intent)
    conversation["needs_agent"] = needs_agent
    
    # Generate response
    if needs_agent:
        # Create ticket and mission order
        mission_order = chatbot_service.generate_mission_order(
            conversation["messages"], 
            intent
        )
        
        # Create ticket in database
        ticket = Ticket(
            title=f"Demande {intent.value}",
            description=mission_order["description"],
            category=intent.value,
            priority=TicketPriority(mission_order["priority"]),
            client_id=current_user.id,
            status=TicketStatus.RECEIVED
        )
        db.add(ticket)
        db.commit()
        
        response_text = chatbot_service.responses["confirm_human"]
        
        # Clean up conversation
        del active_conversations[conv_id]
    else:
        # Continue automated conversation
        response_text = self._get_automated_response(intent, message.text)
    
    return ChatResponse(
        conversation_id=conv_id,
        message=response_text,
        intent=intent.value,
        needs_agent=needs_agent,
        ticket_id=ticket.id if needs_agent else None
    )

def _get_automated_response(self, intent: IntentType, message: str) -> str:
    """Get automated response based on intent"""
    responses = {
        IntentType.BILLING: "Je peux vous aider avec votre facturation. Quel est votre numéro de compte?",
        IntentType.OUTAGE: "Je comprends que vous avez une panne. Pouvez-vous me dire votre adresse?",
        IntentType.TECHNICAL_SUPPORT: "Pour l'assistance technique, pouvez-vous décrire le problème spécifique?",
        IntentType.UNKNOWN: chatbot_service.responses["need_details"]
    }
    return responses.get(intent, chatbot_service.responses["need_details"])