import { ProductType, ClientType, ContentType, DocumentType, DocumentStatus } from '@/types'

export const PRODUCT_TYPES: { value: ProductType; label: string }[] = [
  { value: 'autocallable', label: 'Autocallable' },
  { value: 'capital_protected_note', label: 'Capital Protected Note' },
  { value: 'barrier_reverse_convertible', label: 'Barrier Reverse Convertible' },
  { value: 'worst_of_best_of', label: 'Worst-of / Best-of' },
  { value: 'leverage_certificate', label: 'Leverage Certificate' },
  { value: 'interest_rate_structured', label: 'Interest Rate Structured' },
  { value: 'credit_linked_note', label: 'Credit-Linked Note' },
  { value: 'other', label: 'Other / Custom' },
]

export const CLIENT_TYPES: { value: ClientType; label: string }[] = [
  { value: 'institutional', label: 'Institutional' },
  { value: 'private_bank_eam', label: 'Private Bank / EAM' },
  { value: 'family_office', label: 'Family Office' },
  { value: 'internal', label: 'Internal' },
]

export const CONTENT_TYPES: { value: ContentType; label: string }[] = [
  { value: 'pitch_deck', label: 'Pitch Deck' },
  { value: 'product_explanation', label: 'Product Explanation' },
  { value: 'payoff_diagram', label: 'Payoff Diagram' },
  { value: 'pricing_model', label: 'Pricing Model' },
  { value: 'term_sheet', label: 'Term Sheet' },
  { value: 'legal_regulatory', label: 'Legal / Regulatory' },
  { value: 'market_commentary', label: 'Market Commentary' },
]

export const DOC_TYPES: { value: DocumentType; label: string; color: string }[] = [
  { value: 'pptx', label: 'PowerPoint', color: 'text-orange-400' },
  { value: 'xlsx', label: 'Excel', color: 'text-emerald-400' },
  { value: 'docx', label: 'Word', color: 'text-blue-400' },
  { value: 'pdf', label: 'PDF', color: 'text-red-400' },
]

export const STATUS_OPTIONS: { value: DocumentStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'approved', label: 'Approved' },
  { value: 'archived', label: 'Archived' },
]

export const ACCEPTED_FILE_TYPES = '.pptx,.xlsx,.docx,.pdf'
export const MAX_FILE_SIZE_MB = 50
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

export const SEARCH_RESULT_COUNT = 10
export const SIMILARITY_THRESHOLD = 0.4
