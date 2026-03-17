export type DocumentStatus = 'draft' | 'approved' | 'archived'
export type DocumentType = 'pptx' | 'xlsx' | 'docx' | 'pdf'
export type ProductType =
  | 'autocallable'
  | 'capital_protected_note'
  | 'barrier_reverse_convertible'
  | 'worst_of_best_of'
  | 'leverage_certificate'
  | 'interest_rate_structured'
  | 'credit_linked_note'
  | 'other'
export type ClientType = 'institutional' | 'private_bank_eam' | 'family_office' | 'internal'
export type ContentType =
  | 'pitch_deck'
  | 'product_explanation'
  | 'payoff_diagram'
  | 'pricing_model'
  | 'term_sheet'
  | 'legal_regulatory'
  | 'market_commentary'
export type UserRole = 'admin' | 'user'
export type ChunkType = 'slide' | 'paragraph' | 'section'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  created_at: string
}

export interface Document {
  id: string
  filename: string
  type: DocumentType
  upload_date: string
  uploader: string
  uploader_name?: string
  product_type: ProductType
  client_type: ClientType
  content_type: ContentType
  status: DocumentStatus
  storage_url: string
  thumbnail_url?: string
  chunk_count?: number
  created_at: string
  updated_at: string
}

export interface Chunk {
  id: string
  document_id: string
  chunk_type: ChunkType
  content_text: string
  slide_number?: number
  page_number?: number
  embedding?: number[]
  created_at: string
  document?: Document
}

export interface SlideImage {
  id: string
  chunk_id: string
  image_url: string
  thumbnail_url: string
  created_at: string
}

export interface Client {
  id: string
  name: string
  type: ClientType
  created_at: string
}

export interface ClientLog {
  id: string
  client_id: string
  client?: Client
  document_ids: string[]
  documents?: Document[]
  sender_user_id: string
  sender?: User
  date_sent: string
  notes?: string
  created_at: string
}

export interface SearchResult {
  chunk: Chunk
  document: Document
  similarity: number
  slide_image?: SlideImage
}

export interface DeckSlide {
  chunk_id: string
  document_id: string
  document_name: string
  slide_number?: number
  thumbnail_url?: string
  content_text: string
}

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  autocallable: 'Autocallable',
  capital_protected_note: 'Capital Protected Note',
  barrier_reverse_convertible: 'Barrier Reverse Convertible',
  worst_of_best_of: 'Worst-of / Best-of',
  leverage_certificate: 'Leverage Certificate',
  interest_rate_structured: 'Interest Rate Structured',
  credit_linked_note: 'Credit-Linked Note',
  other: 'Other / Custom',
}

export const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  institutional: 'Institutional',
  private_bank_eam: 'Private Bank / EAM',
  family_office: 'Family Office',
  internal: 'Internal',
}

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  pitch_deck: 'Pitch Deck',
  product_explanation: 'Product Explanation',
  payoff_diagram: 'Payoff Diagram',
  pricing_model: 'Pricing Model',
  term_sheet: 'Term Sheet',
  legal_regulatory: 'Legal / Regulatory',
  market_commentary: 'Market Commentary',
}

export const STATUS_LABELS: Record<DocumentStatus, string> = {
  draft: 'Draft',
  approved: 'Approved',
  archived: 'Archived',
}

export const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  pptx: 'PowerPoint',
  xlsx: 'Excel',
  docx: 'Word',
  pdf: 'PDF',
}
