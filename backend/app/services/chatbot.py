from typing import Dict, List, Optional
from datetime import datetime
import json
from enum import Enum

class IntentType(str, Enum):
    BILLING = "facturation"
    OUTAGE = "panne"
    TECHNICAL_SUPPORT = "support_technique"
    GENERAL = "general"
    UNKNOWN = "unknown"

class ChatbotService:
    def __init__(self):
        # Intent patterns for French language
        self.intent_patterns = {
            IntentType.BILLING: [
                "facture", "facturation", "paiement", "payé", "montant",
                "coût", "prix", "tarif", "abonnement", "crédit"
            ],
            IntentType.OUTAGE: [
                "panne", "coupure", "pas de service", "ne fonctionne pas",
                "problème", "erreur", "défaillance", "hors service"
            ],
            IntentType.TECHNICAL_SUPPORT: [
                "technique", "configuration", "installer", "paramètre",
                "aide", "assistance", "support", "comment faire"
            ]
        }
        
        # Predefined responses
        self.responses = {
            "greeting": "Bonjour! Je suis votre assistant virtuel. Comment puis-je vous aider aujourd'hui?",
            "need_details": "Pouvez-vous me donner plus de détails sur votre problème?",
            "confirm_human": "Je comprends votre problème. Un agent va prendre en charge votre demande.",
            "thank_you": "Merci de nous avoir contactés. Votre ticket a été créé avec succès."
        }
    
    def detect_intent(self, message: str) -> IntentType:
        """Detect intent from user message"""
        message_lower = message.lower()
        
        intent_scores = {}
        for intent, patterns in self.intent_patterns.items():
            score = sum(1 for pattern in patterns if pattern in message_lower)
            if score > 0:
                intent_scores[intent] = score
        
        if intent_scores:
            return max(intent_scores, key=intent_scores.get)
        return IntentType.UNKNOWN
    
    def needs_human_agent(self, message: str, intent: IntentType) -> bool:
        """Determine if human intervention is needed"""
        # Keywords that indicate urgency or complexity
        urgent_keywords = [
            "urgent", "urgence", "immédiat", "critique",
            "ne peux pas", "impossible", "bloqué"
        ]
        
        message_lower = message.lower()
        
        # Check for urgent keywords
        if any(keyword in message_lower for keyword in urgent_keywords):
            return True
        
        # Unknown intents need human review
        if intent == IntentType.UNKNOWN:
            return True
        
        # Check message complexity (very long messages)
        if len(message.split()) > 50:
            return True
        
        return False
    
    def generate_mission_order(self, conversation: List[Dict], intent: IntentType) -> Dict:
        """Generate a mission order proposal for agents"""
        return {
            "type": intent.value,
            "priority": self._determine_priority(conversation, intent),
            "description": self._summarize_conversation(conversation),
            "customer_messages": [msg["text"] for msg in conversation if msg["sender"] == "user"],
            "recommended_agent_skills": self._get_required_skills(intent),
            "estimated_resolution_time": self._estimate_resolution_time(intent),
            "created_at": datetime.utcnow().isoformat()
        }
    
    def _determine_priority(self, conversation: List[Dict], intent: IntentType) -> str:
        """Determine ticket priority based on content"""
        urgent_indicators = ["urgent", "panne totale", "plusieurs clients", "entreprise"]
        
        all_text = " ".join([msg["text"].lower() for msg in conversation])
        
        if any(indicator in all_text for indicator in urgent_indicators):
            return "urgent"
        
        if intent == IntentType.OUTAGE:
            return "important"
        elif intent == IntentType.BILLING:
            return "normal"
        
        return "normal"
    
    def _summarize_conversation(self, conversation: List[Dict]) -> str:
        """Create a summary of the conversation"""
        user_messages = [msg["text"] for msg in conversation if msg["sender"] == "user"]
        return " | ".join(user_messages[-3:])  # Last 3 messages
    
    def _get_required_skills(self, intent: IntentType) -> List[str]:
        """Get required agent skills based on intent"""
        skills_map = {
            IntentType.BILLING: ["facturation", "service_client"],
            IntentType.OUTAGE: ["technique", "réseau", "diagnostic"],
            IntentType.TECHNICAL_SUPPORT: ["technique", "configuration"],
            IntentType.GENERAL: ["service_client"]
        }
        return skills_map.get(intent, ["service_client"])
    
    def _estimate_resolution_time(self, intent: IntentType) -> int:
        """Estimate resolution time in minutes"""
        time_map = {
            IntentType.BILLING: 15,
            IntentType.OUTAGE: 45,
            IntentType.TECHNICAL_SUPPORT: 30,
            IntentType.GENERAL: 20
        }
        return time_map.get(intent, 30)

chatbot_service = ChatbotService()