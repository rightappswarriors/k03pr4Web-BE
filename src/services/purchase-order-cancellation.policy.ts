export type PurchaseOrderCancellationMode = 'DIRECT' | 'REQUEST_APPROVAL' | 'RETURN_OR_DISPUTE' | 'IDEMPOTENT' | 'NOT_ALLOWED'

export function purchaseOrderCancellationMode(status: string): PurchaseOrderCancellationMode {
  if (['PENDING', 'SUPPLIER_ACCEPTED', 'ACCEPTED'].includes(status)) return 'DIRECT'
  if (['PREPARING', 'READY_FOR_DISPATCH'].includes(status)) return 'REQUEST_APPROVAL'
  if (['IN_TRANSIT', 'DELIVERED', 'COMPLETED'].includes(status)) return 'RETURN_OR_DISPUTE'
  if (status === 'CANCELLED') return 'IDEMPOTENT'
  return 'NOT_ALLOWED'
}

export function cancellationRequiresRefund(hasSucceededPayment: boolean) {
  return hasSucceededPayment
}
