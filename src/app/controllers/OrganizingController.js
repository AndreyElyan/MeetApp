import Meetup from '../models/Meetup';

class OrganizingController {
  async index(req, res) {
    const organizedMeetups = await Meetup.findAll({
      where: { user_id: req.userId },
    });

    return res.json(organizedMeetups);
  }
}

export default new OrganizingController();
