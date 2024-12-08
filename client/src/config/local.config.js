export const config = {
  hostname: "localhost",
  baseUrl: "http://localhost:3000",
  inviteLink: "http://localhost:3000/invite?inviteId=",
  resourcesLink: "http://localhost:3000/api/resources",
  devMode: true,
  isLocal: true,
  isDevelop: false,
  isProduction: false,
  invoice: {
    receiptType: '011',
    miPyMEReceiptType: '211',
    sellPoint: 4,
    concept: 1,
    cuit: 30640241698,
  },
  receipt: {
    receiptType: '015',
    miPyMEReceiptType: '211',
    sellPoint: 4,
    concept: 1,
    cuit: 30640241698,
  },
  creditNote: {
    receiptType: '013',
    miPyMEReceiptType: '213',
    sellPoint: 4,
    concept: 1,
    cuit: 30640241698,
  },
  debitNote: {
    receiptType: '012',
    miPyMEReceiptType: '212',
    sellPoint: 4,
    concept: 1,
    cuit: 30640241698,
  }
}
