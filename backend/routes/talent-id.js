const express = require('express');
const { query, withTransaction } = require('../config/database');
const { authenticateToken, requireOrganization } = require('../middleware/auth');
const router = express.Router();
const { body, validationResult } = require('express-validator');

// Helper: Calculate Age
const calculateAge = (dob) => {
    const birthday = new Date(dob);
    const ageDifMs = Date.now() - birthday.getTime();
    const ageDate = new Date(ageDifMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
};

// ================= PUBLIC =================

// Register as a guest for a Talent ID event
router.post('/register', [
    body('eventId').isUUID(),
    body('firstName').notEmpty(),
    body('lastName').notEmpty(),
    body('email').isEmail(),
    body('dateOfBirth').isISO8601()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if(!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const { eventId, firstName, lastName, dateOfBirth, email, phone, position, height } = req.body;

        // Check duplicate
        const check = await query('SELECT id FROM talent_registrations WHERE event_id = $1 AND email = $2', [eventId, email]);
        if(check.rows.length > 0) {
            return res.status(409).json({ error: 'Already registered for this event' });
        }

        const result = await query(`
            INSERT INTO talent_registrations 
            (event_id, first_name, last_name, date_of_birth, email, phone, position, height)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `, [eventId, firstName, lastName, dateOfBirth, email, phone, position, height]);

        res.status(201).json({ message: 'Registration successful', registration: result.rows[0] });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// ================= ADMIN (Protected) =================

// Get Event Dashboard Data (Registrants, Bibs, Groups, Schedule)
router.get('/events/:id/dashboard', authenticateToken, requireOrganization, async (req, res) => {
    try {
        const eventId = req.params.id;
        
        const [registrants, bibs, groups, schedule] = await Promise.all([
            query('SELECT * FROM talent_registrations WHERE event_id = $1 ORDER BY first_name', [eventId]),
            query('SELECT * FROM bibs WHERE club_id = (SELECT club_id FROM events WHERE id = $1)', [eventId]),
            query(`
                SELECT g.*, 
                       (SELECT json_agg(tr.*) FROM event_group_players egp 
                        JOIN talent_registrations tr ON egp.talent_registration_id = tr.id 
                        WHERE egp.group_id = g.id) as players,
                       s.first_name as coach_first_name, s.last_name as coach_last_name
                FROM event_groups g 
                LEFT JOIN staff s ON g.coach_id = s.id
                WHERE g.event_id = $1
            `, [eventId]),
            query('SELECT * FROM event_schedules WHERE event_id = $1 ORDER BY start_time', [eventId])
        ]);

        res.json({
            registrants: registrants.rows,
            bibs: bibs.rows,
            groups: groups.rows,
            schedule: schedule.rows
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to load dashboard' });
    }
});

// Create Schedule Item
router.post('/events/:id/schedule', authenticateToken, requireOrganization, async (req, res) => {
    try {
        const { startTime, endTime, activityName, format, description } = req.body;
        const result = await query(`
            INSERT INTO event_schedules (event_id, start_time, end_time, activity_name, format, description)
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
        `, [req.params.id, startTime, endTime, activityName, format, description]);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Failed to add schedule item' });
    }
});

// Manage Bibs (Batch Add)
router.post('/bibs/batch', authenticateToken, requireOrganization, async (req, res) => {
    try {
        const { clubId, color, startNum, endNum, size } = req.body;
        // Simple loop insert
        let count = 0;
        for (let i = startNum; i <= endNum; i++) {
            await query(`
                INSERT INTO bibs (club_id, color, number, size) 
                VALUES ($1, $2, $3, $4) 
                ON CONFLICT (club_id, color, number) DO NOTHING
            `, [clubId, color, String(i), size]);
            count++;
        }
        res.json({ message: `Added/Updated ${count} bibs` });
    } catch (err) {
        res.status(500).json({ error: 'Failed to batch add bibs' });
    }
});

// Create Group
router.post('/events/:id/groups', authenticateToken, requireOrganization, async (req, res) => {
    try {
        const { name, coachId } = req.body;
        const result = await query(`
            INSERT INTO event_groups (event_id, name, coach_id) VALUES ($1, $2, $3) RETURNING *
        `, [req.params.id, name, coachId]);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create group' });
    }
});

// ================= AUTO ASSIGN MAGIC =================

router.post('/events/:id/auto-assign', authenticateToken, requireOrganization, async (req, res) => {
    const eventId = req.params.id;
    
    try {
        await withTransaction(async (client) => {
            // 1. Fetch all unassigned registrations
            const regs = await client.query(`
                SELECT * FROM talent_registrations 
                WHERE event_id = $1 AND bib_number IS NULL
                ORDER BY date_of_birth DESC -- Younger first
            `, [eventId]);
            
            if (regs.rows.length === 0) return; // Nothing to do

            // 2. Fetch available bibs for this club
            // Assume we want to assign same color if possible, or mixed
            // Ideally we'd let user pick "Use Red Set" but let's just grab all available
            const clubRes = await client.query('SELECT club_id FROM events WHERE id = $1', [eventId]);
            const clubId = clubRes.rows[0].club_id;

            const bibs = await client.query(`
                SELECT * FROM bibs 
                WHERE club_id = $1 AND status = 'available'
                ORDER BY color, number::int
            `, [clubId]);

            let bibIndex = 0;
            const availableBibs = bibs.rows;

            // 3. Assign Bibs
            for (const reg of regs.rows) {
                if (bibIndex >= availableBibs.length) break; // Running out of bibs!
                
                const bib = availableBibs[bibIndex];
                
                // Update Registration
                await client.query(`
                    UPDATE talent_registrations 
                    SET bib_number = $1, bib_color = $2 
                    WHERE id = $3
                `, [bib.number, bib.color, reg.id]);

                // Update Bib Status
                await client.query(`
                    UPDATE bibs SET status = 'assigned' WHERE id = $1
                `, [bib.id]);

                bibIndex++;
            }

            // 4. Auto-Create Groups based on Age (if enabled? let's do simple logic: U11, U13, etc)
            // Or just assign to existing groups if they match names like 'U10'
            // For now, let's just do bib assignment in this endpoint as "Auto-Assign-Bibs"
        });

        res.json({ message: 'Auto-assign completed successfully' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Auto-assign failed' });
    }
});

// Toggle Check-in (Coach/Admin)
router.post('/registrations/:id/checkin', authenticateToken, async (req, res) => { // Access control: simple auth for now
    try {
        const { status } = req.body; // 'checked_in'
        await query('UPDATE talent_registrations SET status = $1 WHERE id = $2', [status || 'checked_in', req.params.id]);
        res.json({ message: 'Updated' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to check in' });
    }
});

module.exports = router;
