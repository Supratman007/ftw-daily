export type ConversationKind = "customer_booking" | "agent_support";
export type ConversationStatus = "open" | "resolved";
export type MessageSender = "customer" | "agent" | "staff";

export interface Conversation {
  id: string;
  kind: ConversationKind;
  booking_id: string | null;
  agent_id: string | null;
  related_product_id: string | null;
  status: ConversationStatus;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender: MessageSender;
  sender_name: string;
  body: string;
  read_at: string | null;
  created_at: string;
}
