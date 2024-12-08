"use strict"

const logger     = require('../utils/logger');
const utils = require('../utils/utils');
const self       = {};
const Log   = require('../models/log.model');
const Billing = require('../models/billing.model');
const Receipt = require('../models/receipt.model');
var moment = require('moment');
var facturajs = require('facturajs');
var AfipServices = facturajs.AfipServices;
const config = require('../config');
var _ = require('lodash');

self.upload = async (req, res) => {  
  if (req.files?.file.tempFilePath) {
    const assetUrl = await utils.uploadImage(req.files.file.tempFilePath)
    return res.json(assetUrl);
  } else {
    return false;
  }
}

self.createReceipt = async (req, res) => {  
  const cuit = req.body.cuit;
  const sellPoint = req.body.sellPoint;
  const receiptType = req.body.receiptType;
  const amount = req.body.amount;
  const fchVtoPago = req.body.FchVtoPago;
  const Opcionales = req.body.Opcionales;
  logger.info('request en backend: ', req);

  try {
    validateBillFields(cuit, sellPoint, receiptType, amount); //Pueden agregarse mas campos a validar

    const nextBillNumber = await getNextBillNumber(cuit, receiptType, sellPoint);
    const createdBill = await createBill(cuit, sellPoint, receiptType, nextBillNumber, amount, fchVtoPago, Opcionales, req);
    
    await self.createLog('Receipt created', JSON.stringify(createdBill));
    console.log('Created bill', JSON.stringify(createdBill, null, 4));

    res.json(createdBill)
  } catch (e) {
    console.error(e);
    res.status(e.status || 500).json({error: e.message})
  }
}

self.getLogs = async (req, res) => {  
  try {
    const logs = await Log.find({deletedAt: null}).sort({'createdAt': -1}).limit(50);
    logger.info('get logs', JSON.stringify(logs))
    res.json(logs);
  } catch (e) {
    logger.error('get logs', e.message)
    res.json({error: e.message})
  }
};

self.createLog = async (action, data) => {  
  try {
    const log = {
      'action': action,
      'data': data
    }
    const newLog = await Log.create(log);
    logger.info('create log', JSON.stringify(log))
    return newLog;
  } catch (e) {
    logger.error('create log', e.message)
    return {error: e.message}
  }
};

self.getLastBillNumberForInfo = async (req, res) => {  
  
  const receiptType = req.body.receiptType || 11;
  const sellPoint = req.body.sellPoint || 4;
  const cuit = req.body.cuit || 30640241698;

  try {
    const afipClient = buildAfipClient();

    const data = await afipClient.getLastBillNumber({
      Auth: { Cuit: cuit },
      params: {
          CbteTipo: receiptType,
          PtoVta: sellPoint,
      },
    });
    console.log('Last bill number: ', JSON.stringify(data));

    res.json({
      ...data,
    })
  } catch (e) {
    console.error('Something was wrong!');
    console.error(e);
    res.json(e)
  }
}

self.createDebitNote = async (req, res) => {  
  try {
    const relatedReceipt = req.body.relatedReceipt
    relatedReceipt.number = parseBillNumber(relatedReceipt.number)
    
    validateRelatedReceipt(relatedReceipt)
    req.body.relatedReceipt = buildRelatedReceipt(relatedReceipt)

    await self.createLog('Creating debit note: ', JSON.stringify(req.body));
    console.log('Creating debit note: ', JSON.stringify(req.body));

    await self.createReceipt(req, res)
  } catch (e) {
    console.error(e);
    res.status(e.status || 500).json({ error: e.message })
  }
}

self.createCreditNote = async (req, res) => {  
  try {
    const relatedReceipt = req.body.relatedReceipt
    relatedReceipt.number = parseBillNumber(relatedReceipt.number)
    
    validateRelatedReceipt(relatedReceipt)
    req.body.relatedReceipt = buildRelatedReceipt(relatedReceipt)

    await self.createLog('Creating credit note: ', JSON.stringify(req.body));
    console.log('Creating credit note: ', JSON.stringify(req.body));

    await self.createReceipt(req, res)
  } catch (e) {
    console.error(e);
    res.status(e.status || 500).json({ error: e.message })
  }
}

function buildRelatedReceipt(relatedReceipt) {
  // if (relatedReceipt.type === '015') {
  //   return {}
  // }
  return {
    "CbtesAsoc": [
      {
        "CbteAsoc": {
          "Tipo": relatedReceipt.type,
          "PtoVta": relatedReceipt.sellpoint || 4,
          "Nro": relatedReceipt.number
        }
      }
    ]
  };
}

async function createBill(cuit, sellPoint, receiptType, nextBillNumber, amount, fchVtoPago, Opcionales, req) {
  const concept = req.body.concept || 1;
  const ImpIVA = 0;
  const ImpTotal = amount;
  const ImpNeto = amount;
  const ImpOpEx = 0;
  const ImpTotConc = 0;
  const relatedReceipt = req.body.relatedReceipt
  const afip = buildAfipClient();
  const docInfo = req.body.docInfo || { DocTipo: 99, DocNro: 0 }

  const billBody = buildBillBody(cuit, sellPoint, receiptType, concept, nextBillNumber, ImpTotal, ImpTotConc, ImpNeto, ImpOpEx, ImpIVA, relatedReceipt, docInfo, fchVtoPago, Opcionales);

  return await afip.createBill(billBody);
}

async function getNextBillNumber(cuit, receiptType, sellPoint) {
  const afip = buildAfipClient();

  const data = await afip.getLastBillNumber(buildLastBillNumberBody(cuit, receiptType, sellPoint));
  console.log('Last bill number: ', JSON.stringify(data));

  const num = data.CbteNro;
  const nextBillNumber = num + 1;
  return nextBillNumber;
}

function buildLastBillNumberBody(cuit, receiptType, sellPoint) {
  return {
    Auth: { Cuit: cuit },
    params: {
      CbteTipo: receiptType,
      PtoVta: sellPoint,
    },
  };
}

function buildBillBody(cuit, sellPoint, receiptType, concept, nextBillNumber, ImpTotal, ImpTotConc, ImpNeto, ImpOpEx, ImpIVA, relatedReceipt, docInfo, fchVtoPago, OpcionalesAttributes) {
  let Opcionales = null;

  if (OpcionalesAttributes?.length) {
    Opcionales = OpcionalesAttributes;
  }

  const body = {
    Auth: {
      Cuit: cuit
    },
    params: {
      FeCAEReq: {
        FeCabReq: {
          CantReg: 1,
          PtoVta: sellPoint,
          CbteTipo: receiptType,
        },
        FeDetReq: {
          FECAEDetRequest: {
            DocTipo: docInfo.DocTipo,
            DocNro: docInfo.DocNro,
            Concepto: concept,
            CbteDesde: nextBillNumber,
            CbteHasta: nextBillNumber,
            CbteFch: moment().format('YYYYMMDD'),
            ImpTotal: ImpTotal,
            ImpTotConc: ImpTotConc,
            ImpNeto: ImpNeto,
            ImpOpEx: ImpOpEx,
            ImpIVA: ImpIVA,
            ImpTrib: 0,
            MonId: 'PES',
            MonCotiz: 1,
            FchVtoPago: fchVtoPago,
            Observaciones: '',
            ...relatedReceipt,
            Opcionales,
          },
        },
      },
    },
  };
  console.log('Bill body: ', JSON.stringify(body));
  return body;
}

//Esto se podria instanciar para no buildearlo en cada request
function buildAfipClient() {
  let afipAuthConfig = {};
  if (config.env === 'prod') {
    afipAuthConfig = {
      certPath: './keys-prod/crear-prod.pem',
      privateKeyPath: './keys-prod/crear-prod.key',
      cacheTokensPath: './keys-prod/.lastTokens',
      homo: false,
      tokensExpireInHours: 12,
    };
  } else {
    afipAuthConfig = {
      certPath: './keys/x509v2.pem',
      privateKeyPath: './keys/privada.key',
      cacheTokensPath: './keys/.lastTokens',
      homo: true,
      tokensExpireInHours: 12,
    };
  }
  return new AfipServices(afipAuthConfig);
}

function validateRelatedReceipt(relatedReceipt) {
  if (!relatedReceipt) {
    throw { status: 400, message: 'El comprobante asociado es obligatorio.' };
  }

  if (!relatedReceipt.type || !relatedReceipt.number || !relatedReceipt.sellPoint) {
    throw { status: 400, message: 'Uno o mas datos obligatorios del comprobante asociado no fueron enviados.' };
  }

  return;
}

function validateBillFields(cuit, sellPoint, receiptType, amount) {
  if (!cuit || !sellPoint || !receiptType || !amount) {
    throw { status: 400, message: 'Uno o mas datos obligatorios de la factura a crear no fueron enviados.' };
  }

  return;
}

function parseBillNumber(inputStr) {
  // Busca un guion ("-") seguido de uno o más dígitos al final del string
  //Esto es necesario porque Afip necesita solo el final del numero sin los '0'
  const match = inputStr.match(/-(\d+)$/);
  
  if (match) {
      const billNumber = match[1];
      // Elimina los ceros a la izquierda del numero
      return billNumber.replace(/^0+/, '');
  } else {
      return null;
  }
}

module.exports = self;
