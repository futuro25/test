import Button from "../common/Button";
import { ReceiptPreview, CreatedReceipt } from "./Receipt";

function ReceiptPreviewDialog({ onClose, receiptPreviews, isGroupReceipt, isLoadingSubmit, confirmOnSubmit, selectedReceipt, showDebitNote=false }) {
    return (
      <div>
        <div className="w-full flex-wrap flex sticky top-0 z-10 bg-white rounded pb-4">
          {
            !selectedReceipt && (
              <h1 className="inline-block text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Confirmación de recibo</h1>
            )
          }
          <div className="ml-auto gap-2 flex print:hidden">
            <Button variant="destructive" disabled={isLoadingSubmit} onClick={() => onClose()}>Volver</Button>
            {
              receiptPreviews && (
                <Button disabled={isLoadingSubmit} onClick={() => confirmOnSubmit()}>{isLoadingSubmit ? 'Creando recibo...' : 'Crear recibo en AFIP'}</Button>
              )
            }
          </div>
        </div>
        {
          selectedReceipt ? (
            <CreatedReceipt receipt={selectedReceipt} showDebitNote={showDebitNote} />
          ) : (
            <ReceiptPreview receiptPreviews={receiptPreviews} isGroupReceipt={isGroupReceipt} />
          )
        }
        <div className="gap-2 justify-center flex print:hidden">
          <Button variant="destructive" disabled={isLoadingSubmit} onClick={() => onClose()}>Volver</Button>
          {
            receiptPreviews && (
              <Button disabled={isLoadingSubmit} onClick={() => confirmOnSubmit()}>{isLoadingSubmit ? 'Creando recibo...' : 'Crear recibo en AFIP'}</Button>
            )
          }
        </div>
      </div>
    )
}

export default ReceiptPreviewDialog;