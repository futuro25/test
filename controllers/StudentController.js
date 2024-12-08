"use strict"

const logger     = require('../utils/logger');
const Student    = require('../models/student.model');
const Courses    = require('../models/course.model');
const Students    = require('../models/student.model');
const Insurances    = require('../models/insurance.model');
const uploadImage = require('../utils/utils');
const utilsController = require('./UtilsController');
const self       = {};

self.createStudent = async (req, res) => {  
  try {
    const student = {
      "name": req.body.name,
      "lastName": req.body.lastName,
      "email": req.body.email,
      "documentNumber": req.body.documentNumber,
      "pictureUrl": req.body.pictureUrl,
      "healthInsurance": req.body.healthInsurance,
      "cudUrl": req.body.cudUrl,
      "cudDueDate": req.body.cudDueDate,
      "billingDue": req.body.billingDue,
      "birthdayDate": req.body.birthdayDate,
      "course": req.body.course,
      "affiliateNumber": req.body.affiliateNumber,
      "affiliateRelative": req.body.affiliateRelative,
      "invoiceHolder": req.body.invoiceHolder,
      "enabled": req.body.enabled,
      "observations": req.body.observations,
      "parents": addParentsInfo(req.body)
    }

    const newStudent = await Student.create(student);
    await utilsController.createLog('Student created', JSON.stringify(newStudent));
    logger.info('create student', JSON.stringify(student))
    return res.json(newStudent);
  } catch (e) {
    logger.error('create student', e.message)
    res.json({error: e.message})
  }
};

const addParentsInfo = (body) => {
  return [
    {
      "name": body.firstParentName,
      "lastName": body.firstParentLastName,
      "documentType": body.firstParentDocumentType,
      "documentNumber": body.firstParentDocumentNumber,
      "phone": body.firstParentPhone,
      "email": body.firstParentEmail,
      "address": body.firstParentAddress,
      "city": body.firstParentCity,
    },
    {
      "name": body.secondParentName,
      "lastName": body.secondParentLastName,
      "documentType": body.secondParentDocumentType,
      "documentNumber": body.secondParentDocumentNumber,
      "phone": body.secondParentPhone,
      "email": body.secondParentEmail,
      "address": body.secondParentAddress,
      "city": body.secondParentCity,
    }
  ];
};

self.getStudentsWithExpirations = async (req, res) => {  
  try {
    const myDate = new Date();
    const startDate = new Date();
    const endDate = new Date(myDate.setMonth(myDate.getMonth()+1));

    const condition = {deletedAt: null, cudDueDate: {$gte: startDate, $lte: endDate}}
    const students = await Student.find(condition);

    logger.info('get students', JSON.stringify(students))
    res.json(students);
  } catch (e) {
    logger.error('get students', e.message)
    res.json({error: e.message})
  }
};

self.getStudents = async (req, res) => {  
  try {
    const enabled = req.query.enabled || '';
    const studentsUpdated = []
    let filters = {};

    if (enabled !== undefined && enabled !== '') {
      filters = {deletedAt: null, enabled: enabled};
    } else {
      filters = {deletedAt: null};
    }

    const students = await Student.find(filters);
    const insurances = await Insurances.find({deletedAt: null});
    let insurancesUpdated = []

    for (const insurance of insurances) {
      insurancesUpdated.push({
        id: insurance._id.toString(),
        plan: insurance.plan,
      })
    }

    for (const student of students) {

      studentsUpdated.push({
        ...student, 
        _id: student._id,
        name: student.name,
        lastName: student.lastName,
        documentNumber: student.documentNumber,
        email: student.email,
        course: student.course,
        cudDueDate: student.cudDueDate,
        cudUrl: student.cudUrl,
        healthInsurance: student.healthInsurance,
        healthInsuranceName: insurancesUpdated.find(insurance => student.healthInsurance === insurance.id)?.plan ?? ' ',
        parents: student.parents,
        affiliateNumber: student.affiliateNumber,
        affiliateRelative: student.affiliateRelative,
        invoiceHolder: student.invoiceHolder,
        enabled: student.enabled,
        observations: student.observations,
        birthdayDate: student.birthdayDate,
        createdAt: student.createdAt,
        updatedAt: student.updatedAt,
        deletedAt: student.deletedAt
      })
    }

    logger.info('get students', JSON.stringify(studentsUpdated))
    res.json(studentsUpdated);
  } catch (e) {
    logger.error('get students', e.message)
    res.json({error: e.message})
  }
};

self.getStudentById = async (req, res) => {  
  try {
    const studentId = req.params.studentId;
    const student = await Student.findOne({_id: studentId, deletedAt: null})

    logger.info('get student by id', studentId)
    res.json(student);
  } catch (e) {
    logger.error('get student by id', e.message)
    res.json({error: e.message})
  }
};

self.getStudentByIdAndUpdate = async (req, res) => {  
  try {
    const studentId = req.params.studentId;
    const filter = { _id: studentId, deletedAt: null };

    let updateBody = req.body;
    updateBody.parents = addParentsInfo(updateBody);

    const updatedStudent = await Student.findOneAndUpdate(filter, updateBody, {new: true});

    logger.info('update student by id', studentId, ' update', JSON.stringify(updateBody))
    await utilsController.createLog('Student updated', JSON.stringify(updatedStudent));
    res.json(updatedStudent);
  } catch (e) {
    logger.error('update student by id', e.message)
    res.json({error: e.message})
  }
};

self.deleteStudentById = async (req, res) => {  
  try {
    const studentId = req.params.studentId;

    const filter = { _id: studentId };
    const update = {deletedAt: Date.now()};

    await Student.findOneAndUpdate(filter, update)
    const updatedStudent = await Student.findOne({_id: studentId})
    await utilsController.createLog('Student deleted', JSON.stringify(updatedStudent));
    logger.info('delete student by id', studentId)
    res.json(updatedStudent);
  } catch (e) {
    logger.error('delete student by id', e.message)
    res.json({error: e.message})
  }
};

self.getStudentsFunction = async () => {  
  try {
    const students = await Student.find({deletedAt: null});

    logger.info('get students', JSON.stringify(students))
    return students;
  } catch (e) {
    logger.error('get students', e.message)
    return {error: e.message}
  }
};

self.getAllStaff = async (req, res) => {

  try {
    const students = await Students.find({deletedAt: null}, {__v: false});
    const courses = await Courses.find({deletedAt: null});
    const insurances = await Insurances.find({deletedAt: null});
    const staffList = []

    for (const student of students) {
      staffList.push({
        ...student.toObject(), 
        insuranceName: insurances.find(i => i._id.toString() === student.healthInsurance.toString()).name || '',
        courses: courses.find(i => i._id.toString() === student.course.toString()).name || '',
      })
    }

    logger.info('getting full staff list', staffList.length)
    res.json(staffList);
  } catch (e) {
    logger.error('Error getting all staff', e.message)
    res.json({error: e.message})
  }
}

module.exports = self;