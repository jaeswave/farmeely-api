const { v4: uuidv4 } = require("uuid");
const {
  findQuery,
  insertOne,
  updateOne,
  updateWithOperators,
} = require("../repository");
const { messages } = require("../constants/messages");

// Create Expatriate Group
const createExpatriateGroup = async (req, res, next) => {
  const {
    group_name,
    description,
    location,
    country,
    max_members,
    is_public,
    membership_approval,
    tags,
  } = req.body;

  // Get user data from middleware
  const user_id = req.params.customer_id;
  const user_email = req.params.email;
  const user_name = req.params.name; // Assuming you have name in user data

  try {
    // Validate required fields
    if (!group_name || !description || !location || !country) {
      const err = new Error(
        "Group name, description, location, and country are required"
      );
      err.status = 400;
      return next(err);
    }

    // Check if group name already exists in location
    const [existingGroup] = await findQuery("Expatriate", {
      group_name: group_name,
      location: location,
    });

    if (existingGroup) {
      const err = new Error(
        "A group with this name already exists in this location"
      );
      err.status = 400;
      return next(err);
    }

    const group_id = uuidv4();

    const groupData = {
      group_id: group_id,
      group_name: group_name,
      description: description,
      location: location,
      country: country,
      group_type: "expatriate",
      createdBy: user_id,
      max_members: max_members || 50,
      is_public: is_public !== undefined ? is_public : true,
      membership_approval: membership_approval || false,
      tags: tags || [],
      members: [
        {
          user_id: user_id,
          user_email: user_email,
          user_name: user_name,
          joined_at: new Date(),
          role: "admin",
        },
      ],
      status: "active",
    };

    await insertOne("Expatriate", groupData);

    res.status(201).json({
      status: true,
      message: "Expatriate group created successfully",
      data: {
        group_id: group_id,
        group_name: group_name,
        location: location,
        country: country,
        current_members: 1,
        max_members: groupData.max_members,
        is_public: groupData.is_public,
        created_at: new Date(),
      },
    });
  } catch (err) {
    next(err);
  }
};

// Join Expatriate Group
const joinExpatriateGroup = async (req, res, next) => {
  const { group_id } = req.params;

  // Get user data from middleware
  const user_id = req.params.customer_id;
  const user_email = req.params.email;
  const user_name = req.params.name;

  try {
    // Find the group
    const [group] = await findQuery("Expatriate", {
      group_id: group_id,
    });

    if (!group) {
      const err = new Error("Group not found");
      err.status = 404;
      return next(err);
    }

    // Check if group is active
    if (group.status !== "active") {
      const err = new Error(
        `This group is ${group.status} and not accepting new members`
      );
      err.status = 400;
      return next(err);
    }

    // Check if user is already a member
    const isAlreadyMember = group.members.some(
      (member) => member.user_id.toString() === user_id.toString()
    );

    if (isAlreadyMember) {
      const err = new Error("You are already a member of this group");
      err.status = 400;
      return next(err);
    }

    // Check if group has space
    if (group.members.length >= group.max_members) {
      const err = new Error("This group has reached maximum capacity");
      err.status = 400;
      return next(err);
    }

    // If membership requires approval
    if (group.membership_approval) {
      // Add to pending approvals (you'll need to implement this)
      const err = new Error(
        "This group requires approval to join. Your request has been submitted."
      );
      err.status = 202;
      return next(err);
    }

    // Add user to members
    const newMember = {
      user_id: user_id,
      user_email: user_email,
      user_name: user_name,
      joined_at: new Date(),
      role: "member",
    };

    await updateWithOperators(
      "Expatriate",
      { group_id: group_id },
      {
        $push: { members: newMember },
      }
    );

    res.status(200).json({
      status: true,
      message: "Successfully joined the expatriate group",
      data: {
        group_id: group_id,
        group_name: group.group_name,
        location: group.location,
        your_role: "member",
        total_members: group.members.length + 1,
        joined_at: new Date(),
      },
    });
  } catch (err) {
    next(err);
  }
};

// Get Single Expatriate Group
const getSingleExpatriateGroup = async (req, res, next) => {
  const { group_id } = req.params;

  try {
    const [group] = await findQuery("Expatriate", {
      group_id: group_id,
    });

    if (!group) {
      const err = new Error("Group not found");
      err.status = 404;
      return next(err);
    }

    res.status(200).json({
      status: true,
      message: "Group details retrieved successfully",
      data: group,
    });
  } catch (err) {
    next(err);
  }
};

// Get All Expatriate Groups
const getAllExpatriateGroups = async (req, res, next) => {
  const { location, country, group_type, page = 1, limit = 10 } = req.query;

  try {
    let query = {};

    if (location) query.location = new RegExp(location, "i");
    if (country) query.country = new RegExp(country, "i");
    if (group_type) query.group_type = group_type;
    query.status = "active"; // Only show active groups

    const groups = await findQuery("Expatriate", query, {
      skip: (page - 1) * limit,
      limit: parseInt(limit),
      sort: { created_at: -1 },
    });

    // Get total count for pagination
    const total = await countQuery("Expatriate", query);

    res.status(200).json({
      status: true,
      message: "Expatriate groups retrieved successfully",
      data: {
        groups: groups,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / limit),
          total_groups: total,
          has_next: page * limit < total,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// Leave Expatriate Group
const leaveExpatriateGroup = async (req, res, next) => {
  const { group_id } = req.params;

  // Get user data from middleware
  const user_id = req.params.customer_id;

  try {
    const [group] = await findQuery("Expatriate", {
      group_id: group_id,
    });

    if (!group) {
      const err = new Error("Group not found");
      err.status = 404;
      return next(err);
    }

    // Check if user is a member
    const isMember = group.members.some(
      (member) => member.user_id.toString() === user_id.toString()
    );

    if (!isMember) {
      const err = new Error("You are not a member of this group");
      err.status = 400;
      return next(err);
    }

    // Prevent admin from leaving if they're the only admin
    const userMember = group.members.find(
      (member) => member.user_id.toString() === user_id.toString()
    );

    if (userMember.role === "admin") {
      const adminCount = group.members.filter(
        (member) => member.role === "admin"
      ).length;
      if (adminCount === 1) {
        const err = new Error(
          "You are the only admin. Assign another admin before leaving."
        );
        err.status = 400;
        return next(err);
      }
    }

    // Remove user from members
    await updateWithOperators(
      "Expatriate",
      { group_id: group_id },
      {
        $pull: { members: { user_id: user_id } },
      }
    );

    res.status(200).json({
      status: true,
      message: "Successfully left the group",
      data: {
        group_id: group_id,
        group_name: group.group_name,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createExpatriateGroup,
  joinExpatriateGroup,
  getSingleExpatriateGroup,
  getAllExpatriateGroups,
  leaveExpatriateGroup,
};
