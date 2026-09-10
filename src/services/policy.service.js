const Policy = require('../models/Policy');
const User = require('../models/User');

class PolicyService {
  /**
   * Search policies by user's name / username
   * @param {string} username - User first name or name to search
   */
  async searchByUsername(username) {
    if (!username || typeof username !== 'string' || !username.trim()) {
      throw new Error("Query parameter 'username' is required.");
    }

    const cleanUsername = username.trim();

    // 1. Find user(s) matching the username (case-insensitive)
    const users = await User.find({
      $or: [
        { firstName: { $regex: new RegExp(cleanUsername, 'i') } },
        { email: { $regex: new RegExp(cleanUsername, 'i') } }
      ]
    }).select('_id firstName email phoneNumber city state userType');

    if (!users || users.length === 0) {
      return {
        matchedUsersCount: 0,
        policiesCount: 0,
        policies: []
      };
    }

    const userIds = users.map((u) => u._id);

    // 2. Find policies for these users with full relational population
    const policies = await Policy.find({ user: { $in: userIds } })
      .populate('user', 'firstName dob address phoneNumber state zipCode email gender userType city')
      .populate('policyCategory', 'categoryName')
      .populate('carrier', 'companyName')
      .populate('account', 'accountName accountType')
      .populate('agent', 'agentName')
      .sort({ policyStartDate: -1 })
      .lean();

    return {
      matchedUsersCount: users.length,
      policiesCount: policies.length,
      policies: policies
    };
  }

  /**
   * Aggregate policies by each user.
   * Returns each user's policy count, total premium amount, and list of policies.
   */
  async getAggregatedPoliciesByUser() {
    const aggregation = await Policy.aggregate([
      {
        $group: {
          _id: '$user',
          totalPolicies: { $sum: 1 },
          totalPremium: { $sum: '$premiumAmount' },
          policyNumbers: { $push: '$policyNumber' },
          policies: {
            $push: {
              policyNumber: '$policyNumber',
              policyStartDate: '$policyStartDate',
              policyEndDate: '$policyEndDate',
              premiumAmount: '$premiumAmount',
              policyType: '$policyType',
              policyMode: '$policyMode',
              category: '$policyCategory',
              carrier: '$carrier'
            }
          }
        }
      },
      // Join with User collection to get user details
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userDetails'
        }
      },
      {
        $unwind: {
          path: '$userDetails',
          preserveNullAndEmptyArrays: true
        }
      },
      // Lookup categories for readable names if needed
      {
        $project: {
          _id: 0,
          userId: '$_id',
          userName: '$userDetails.firstName',
          userEmail: '$userDetails.email',
          userPhone: '$userDetails.phoneNumber',
          userType: '$userDetails.userType',
          city: '$userDetails.city',
          state: '$userDetails.state',
          totalPolicies: '$totalPolicies',
          totalPremium: { $round: ['$totalPremium', 2] },
          policyNumbers: '$policyNumbers',
          policies: '$policies'
        }
      },
      {
        $sort: { totalPolicies: -1, totalPremium: -1 }
      }
    ]);

    return {
      totalUsersWithPolicies: aggregation.length,
      aggregatedData: aggregation
    };
  }
}

module.exports = new PolicyService();
