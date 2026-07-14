const MINIMUM_FARMEELY_PRICE = {
  price: 5000,
  quarterOfTheProductPrice: 0.25,
};

const ACTIVE_SLOT_STATUS = {
  active: "active",
  inactive: "closed",
  fullyBooked: "fully_booked",
};

const FARMEELY_STATUS = {
  inProgress: "in_progress",
  groupCompleted: "group_completed",
  fullyBooked: "fully_booked",
  completed: "completed",
};

const REQUEST_STATUS = {
  PENDING: "pending",
  APPROVED: "paid",
  IN_PROGRESS: "shipped",
  COMPLETED: "delivered",
  DECLINED: "canceled",
};

module.exports = {
  MINIMUM_FARMEELY_PRICE,
  ACTIVE_SLOT_STATUS,
  FARMEELY_STATUS,
  REQUEST_STATUS,
};
