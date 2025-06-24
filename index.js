// import express from 'express';
// import cors from 'cors';
// import dotenv from 'dotenv';
// import pg from 'pg';
// import bcrypt from 'bcryptjs';
// import jwt from 'jsonwebtoken';
// import gDrive from './gDriveSetup.json' assert { type: 'json' };
// import multer from 'multer';
// import { google } from 'googleapis';
// import { createClient } from '@supabase/supabase-js';
// import { v4 as uuidv4 } from 'uuid';

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const gDrive = require('./gDriveSetup.json');
const multer = require('multer');
const { google } = require('googleapis');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

//  

const app = express();
// const { Pool } = pg;
const upload = multer();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const gDriveEmail = gDrive.client_email;
const gDriveAuthKey = gDrive.private_key;
const gDriveSharedFolderID = process.env.GDRIVE_FOLDER_ID;

const auth = new google.auth.JWT({
    email: gDriveEmail,
    key: gDriveAuthKey,
    scopes:['https://www.googleapis.com/auth/drive']
});

auth.authorize((err, tokens) => {
    if (err) {
        console.error('Auth failed:', err);
    } else {
        console.log('✅ Gdrive Auth successful');
    }
});

const drive = google.drive({ version: 'v3', auth });

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        const { data: users, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .limit(1);

        if (error || users.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            console.log('atau ini')
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            {
                // id: user.id,
                username: user.username,
                fullName: user.full_name,
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(200).json({ success: true, message: 'Login Successfully!', token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed To Login!', error });
    }
});

app.post('/register', async (req, res) => {
    try {
        const { username, password, full_name } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);

        const { data, error } = await supabase
            .from('users')
            .insert([
                {
                    username,
                    password: hashedPassword,
                    full_name,
                }
            ])
            .select('id, username, full_name')
            .single();

        if (error) {
            if (error.code === '23505' || error.message.includes('duplicate')) {
                return res.status(400).json({ message: 'Username already exists' });
            }
            throw error;
        }

        res.status(201).json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error });
    }
});

app.post('/add-note', async (req,res) => {

    try {
        const { contentBody } = req.body;
        const title = contentBody.title;
        const note_date = contentBody.date;
        const category = contentBody.category;
        const content = contentBody.content;

        const attachment_url = null;

        const { data, error } = await supabase
            .from('notes')
            .insert([
                {
                    title,
                    note_date,
                    category,
                    attachment_url,
                    content,
                }
            ])
            .select('title')
            .single();

        if (error) {
            if (error.code === '23505' || error.message.includes('duplicate')) {
                return res.status(400).json({ message: 'Username already exists' });
            }
            throw error;
        }

        res.status(200).json({ success:true, message:'Add Note Successfully!'});
    } catch (error) {
        console.error('Failed To Add Note : ', error);
        res.status(500).json({ message:'Failed To Add Note', error});
    }
    
    
})

app.get('/list-note', async (req,res) => {
    try {
        const { data : notes, error } = await supabase
            .from('notes')
            .select('*')
            .order('updated_at', {ascending:false});

        if (error || notes.length === 0) {
            return res.status(401).json({ message: 'Notes Not Found' });
        }
        
        res.status(200).json({ notes });
    } catch (error) {
        console.error('Failed To Fetch List Note : ', error);
        res.status(500).json({ success: false, message: 'Failed To Fetch List Note!', error });
    }
})

app.put('/update-note/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { currentNote } = req.body;

        const title = currentNote.title;
        const note_date = currentNote.date;
        const category = currentNote.category;
        const content = currentNote.content;

        const attachment_url = null; // Update this if you're handling attachments

        const { data, error } = await supabase
            .from('notes')
            .update({
                title,
                note_date,
                category,
                attachment_url,
                content,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select('title')
            .single();

        if (error) {
            throw error;
        }

        if (!data) {
            return res.status(404).json({ message: 'Note not found' });
        }

        res.status(200).json({ success: true, message: 'Note updated successfully!' });
    } catch (error) {
        console.error('Failed to update note:', error);
        res.status(500).json({ message: 'Failed to update note', error });
    }
});

app.delete('/delete-note/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const { error } = await supabase
            .from('notes')
            .delete()
            .eq('id', id);

        if (error) {
            throw error;
        }

        res.status(200).json({ success: true, message: 'Note deleted successfully!' });
    } catch (error) {
        console.error('Failed to delete note:', error);
        res.status(500).json({ success: false, message: 'Failed to delete note', error });
    }
});





// app.post('/login', async ( req, res ) => {
//     try {
//         const { username, password } = req.body;
//         const result = await pool.query(
//           'SELECT * FROM users WHERE username = $1',
//             [username]
//         );
    
//         if (result.rows.length === 0) {
//             return res.status(401).json({ message: 'Invalid credentials' });
//         }
    
//         const user = result.rows[0];
//         const validPassword = await bcrypt.compare(password, user.password);

//         if (!validPassword) {
//             return res.status(401).json({ message: 'Invalid credentials' });
//         }
    
//         // Change based on your user table
//         const token = jwt.sign(
//             { 
//                 id: user.id,
//                 username: user.username,
//                 fullName: user.full_name,
//                 role: user.role,
//                 type: user.type
//             },
//             process.env.JWT_SECRET,
//             { expiresIn: '24h' }
//         );
//         res.status(200).json({ success:true, message:'Login Successfully !', token:token })
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ success:false, error:error, message:'Failed To Login !'})
//     }
// })

// app.get('/register', async(req,res) => {
//     try {
//         const { username, password, full_name, role, type } = req.body;
//         const hashedPassword = await bcrypt.hash(password, 10);
        
//         const result = await pool.query(
//             'INSERT INTO users (username, password, full_name, role, type) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, full_name, role, type',
//             [username, hashedPassword, full_name, role, type]
//         );
        
//         res.status(201).json(result.rows[0]);
//     } catch (error) {
//         if (error.code === '23505') { // unique_violation
//             res.status(400).json({ message: 'Username already exists' });
//         } else {
//             res.status(500).json({ message: 'Server error' });
//         }
//     }
// })