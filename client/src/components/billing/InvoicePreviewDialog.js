import Button from "../common/Button";
import { InvoicePreview } from "../Invoice";

function InvoicePreviewDialog({ onClose, invoicePreview: previewData, isLoadingSubmit, confirmOnSubmit }) {
    return (
        <div>
            <div className="w-full flex-wrap flex sticky top-0 z-10 bg-white rounded pb-4">
                <h1 className="inline-block text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Confirmación de factura</h1>
                <div className="ml-auto gap-2 flex">
                    <Button variant="destructive" disabled={isLoadingSubmit} onClick={() => onClose()}>Volver</Button>
                    <Button disabled={isLoadingSubmit} onClick={() => confirmOnSubmit()}>{isLoadingSubmit ? 'Creando factura...' : 'Crear factura en AFIP'}</Button>
                </div>
            </div>
            <InvoicePreview previewData={previewData} />
            <div className="gap-2 justify-center flex">
                <Button variant="destructive" disabled={isLoadingSubmit} onClick={() => onClose()}>Volver</Button>
                <Button disabled={isLoadingSubmit} onClick={() => confirmOnSubmit()}>{isLoadingSubmit ? 'Creando factura...' : 'Crear factura en AFIP'}</Button>
            </div>
        </div>
    )
}

export default InvoicePreviewDialog;