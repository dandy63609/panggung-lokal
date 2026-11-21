const express = require('express');
const router = express.Router();
const db = require('../utils/db');

/**
 * GET /api/settings/public
 * Returns public-facing platform settings
 */
router.get('/public', async (req, res) => {
  try {
    const result = await db.query("SELECT value FROM platform_settings WHERE key = 'show_campus_affiliation'");
    const showCampusAffiliation = result.rows.length > 0 ? result.rows[0].value === 'true' : false;
    return res.json({
      success: true,
      data: {
        showCampusAffiliation
      }
    });
  } catch (error) {
    // If table doesn't exist yet, return safe fallback
    return res.json({
      success: true,
      data: {
        showCampusAffiliation: false
      }
    });
  }
});

module.exports = router;
