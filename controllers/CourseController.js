"use strict"

const logger = require('../utils/logger');
const Course = require('../models/course.model');
const self = {};

self.createCourse = async (req, res) => {
  try {
    let course = { 'name': req.body.name, 'periods': [] }

    for (const period of req.body.periods) {
      let coursePeriod = buildCoursePeriod(req, period);
      course.periods.push(coursePeriod);
    }
    const newCourse = await Course.create(course);
    logger.info('create course', JSON.stringify(newCourse))
    return res.json(newCourse);
  } catch (e) {
    logger.error('create course', e.message)
    console.log(e)
    res.status(500).json({ error: e.message })
  }
};

self.getCourses = async (req, res) => {
  try {
    const courses = await Course.find({ deletedAt: null });
    sortCoursesAndPeriods(courses);

    logger.info('get courses', JSON.stringify(courses))
    res.json(courses);
  } catch (e) {
    logger.error('get courses', e.message)
    res.json({ error: e.message })
  }
};

self.getCourseById = async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const course = await Course.findOne({ _id: courseId, deletedAt: null })
    logger.info('get course by id', courseId)
    res.json(course);
  } catch (e) {
    logger.error('get course by id', e.message)
    res.json({ error: e.message })
  }
};

self.getCourseByIdAndUpdate = async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const filter = { _id: courseId, deletedAt: null };
    const existingCourse = await Course.findOne(filter);

    if (!existingCourse) {
      return res.status(404).json({ error: 'Course not found' });
    }

    let update = { 'name': req.body.name || existingCourse.name, 'periods': [] };
    update.periods = req.body.periods;

    const updatedCourse = await Course.findOneAndUpdate(filter, update, { new: true })

    console.log('update course by id', courseId, ' update', JSON.stringify(update))
    res.json(updatedCourse);
  } catch (e) {
    logger.error('update course by id', e.message)
    res.status(500).json({ error: e.message })
  }
};

self.deleteCourseById = async (req, res) => {
  try {
    const courseId = req.params.courseId;

    const filter = { _id: courseId };
    const update = { deletedAt: Date.now() };

    await Course.findOneAndUpdate(filter, update)
    const updatedCourse = await Course.findOne({ _id: courseId })
    logger.info('delete course by id', courseId)
    res.json(updatedCourse);
  } catch (e) {
    logger.error('delete course by id', e.message)
    res.json({ error: e.message })
  }
};

module.exports = self;

function sortCoursesAndPeriods(courses) {
  courses.forEach(course => sortPeriodsByMonth(course.periods));
}

function sortPeriodsByMonth(periods) {
  periods.sort((a, b) => parseInt(a.month) - parseInt(b.month));
}

function buildCoursePeriod(req, period) {
  return {
    'price': period.price || '0',
    'partialPrice': period.partialPrice || '0',
    'month': period.month,
    'year': req.body.year,
    'resolution': period.resolution || ""
  }
}