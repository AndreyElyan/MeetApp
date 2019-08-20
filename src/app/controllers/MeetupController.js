import * as Yup from 'yup';
import { Op } from 'sequelize';
import { isBefore, parseISO, startOfDay, endOfDay, isValid } from 'date-fns';

import Meetup from '../models/Meetup';
import User from '../models/User';

class MeetupController {
  async index(req, res) {
    const { page = 1, date } = req.query;
    const parsedDate = parseISO(date);

    if (!isValid(parsedDate)) {
      return res.status(400).json({ error: 'Invalid date' });
    }

    const meetups = await Meetup.findAll({
      where: {
        date: {
          [Op.between]: [startOfDay(parsedDate), endOfDay(parsedDate)],
        },
      },
      attributes: {
        exclude: ['user_id'],
      },
      include: [
        {
          model: User,
          attributes: ['name', 'email'],
        },
      ],
      limit: 10,
      offset: (page - 1) * 10,
    });

    return res.json(meetups);
  }

  async store(req, res) {
    const schema = Yup.object().shape({
      title: Yup.string().required(),
      description: Yup.string().required(),
      location: Yup.string().required(),
      date: Yup.date().required(),
      image_id: Yup.number().required(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation error' });
    }

    if (isBefore(parseISO(req.body.date), new Date())) {
      return res.status(400).json({ error: 'Past dates are not permitted' });
    }

    const user_id = req.userId;

    const meetup = await Meetup.create({
      ...req.body,
      user_id,
    });

    return res.json(meetup);
  }

  async update(req, res) {
    const schema = Yup.object().shape({
      title: Yup.string(),
      description: Yup.string(),
      location: Yup.string(),
      date: Yup.date(),
      image_id: Yup.number(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation error' });
    }

    const meetup = await Meetup.findByPk(req.params.id);

    if (meetup.past) {
      return res.status(400).json({ error: 'Can not update past meetups' });
    }

    if (isBefore(parseISO(req.body.date), new Date())) {
      return res.status(400).json({ error: 'Invalid date' });
    }

    if (req.userId !== meetup.user_id) {
      return res.status(401).json({ error: 'User is not the organizer' });
    }

    await meetup.update(req.body);

    return res.json(meetup);
  }

  async delete(req, res) {
    const meetup = await Meetup.findByPk(req.params.id);

    if (meetup.past) {
      return res.status(400).json({ error: `Can't delete past meetups` });
    }

    if (req.userId !== meetup.user_id) {
      return res.status(401).json({ error: 'User is not the organizer' });
    }

    await meetup.destroy();

    return res.json();
  }
}

export default new MeetupController();
