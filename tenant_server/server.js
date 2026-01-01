// server.js
// require('dotenv').config();
// const path = require('path');
// const express = require('express');
// const cors = require('cors');               // ← import cors
// const http = require('http');
// const axios = require('axios');
// const { randomUUID } = require('crypto');

// const { Server } = require('socket.io');
// const { Kafka } = require('kafkajs');

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import axios from 'axios';
import { randomUUID } from 'crypto';
import { Server } from 'socket.io';
import { Kafka } from 'kafkajs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import { TENANT_REALM, kcRouter } from './keycloak-client.mjs'


const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const app = express();
const server = http.createServer(app);


const TRANSLATOR_URL = process.env.TRANSLATOR_URL || 'http://localhost:5001';
const TENANT_ID      = process.env.TENANT_ID;
const KAFKA_BROKER   = process.env.KAFKA_BROKER;
const T_PORT         = process.env.T_PORT;

const kafka    = new Kafka({ clientId: 'chat-server', brokers: [KAFKA_BROKER] });
const producer = kafka.producer();
// const topic    = `chat-${TENANT_ID}`;
console.log("KAFKA_BROKER", KAFKA_BROKER)

// 1) HTTP CORS
app.use(cors({
  origin: ['http://localhost:8081'],       // ← allow your front-end origin(s)
  methods: ['GET','POST','DELETE','OPTIONS'],
  credentials: true
}));

// 2) Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:8081'],     // ← same origins here
    methods: ['GET','POST','DELETE','OPTIONS'],
    credentials: true
  }
});


// Config endpoint (will now automatically include CORS headers)
app.get('/config', (req, res) => {
  res.json({ companyName: TENANT_ID });
});

// Serve static UI
app.use(express.static(path.join(__dirname, 'public')));

app.use("/kcadmin", kcRouter)

/**
 * Ensure that raw-topic state has a translation into targetLang.
 *
 * @param {string} chatId
 * @param {object} state    – the latest RawState for a message
 * @param {string} targetLang
 * @returns {Promise<object>} – updated state with translations[targetLang] populated
 */
async function ensureTranslationInRaw(chatId, state, targetLang, produce = true) {
  // if we already translated it, nothing to do
  if (state.translations[targetLang]) {
    return state;
  }

  const rawTopic   = `chat-${chatId}`;
  const sourceLang = state.originalLang;
  const sourceText = state.originalText;

  // call your translation service
  let translated;
  try {
    const { data } = await axios.post(
      `${TRANSLATOR_URL}/translate`,
      { text: sourceText, from_lang: sourceLang, to: targetLang }
    );
    translated = data.translated;
  } catch (err) {
    console.error(`⚠️ Translation error for ${state.messageId} ${sourceLang}→${targetLang}`, err);
    translated = sourceText;  // fallback to the original text
  }

  // update the in-memory map
  const updated = {
    ...state,
    translations: {
      ...state.translations,
      [targetLang]: translated
    }
  };
  await producer.send({
    topic: rawTopic,
    messages: [{
      key:   state.messageId,
      value: JSON.stringify(updated)
    }]
  });

  return updated;
}


// 1) Pull query helper unchanged except we keep originText and full translations map
async function fetchHistoryFromTable(chatId) {
  const tableName = `CHAT_${chatId.toUpperCase()}_DEDUPE`;
  const ksql = `SELECT MESSAGEID, TS, USER, ORIGINALTEXT, TRANSLATIONS, ORIGINALLANG FROM ${tableName};`.trim();

  const resp = await axios.post(
    `${process.env.KSQLDB_URL}/query`,
    { ksql },
    {
      headers: {
        'Content-Type': 'application/vnd.ksql.v1+json; charset=utf-8',
      }
    }
  );

  console.log("resp.data: ", resp.data)

  const rows = [];
  for (const item of resp.data) {
    if (item.row?.columns) {
      const [
        messageId,
        ts,
        user,
        originalText,
        translations,
        originalLang
      ] = item.row.columns;

      rows.push({ messageId, ts, user, originalText, translations, originalLang });
    }
  }

  return rows;
}

// 2) New replayHistory that backfills missing translations
async function replayHistory(socket, chatId) {
  const targetLang = socket.userLang;
  socket.emit('historyStart');

  let records = await fetchHistoryFromTable(chatId);

  // Sort by TS
  records.sort((a,b) => new Date(a.ts) - new Date(b.ts));

  for (let rec of records) {
    let { messageId, ts, user, originalText, translations, originalLang } = rec;
    // translations is a JS object: { en: "...", es: "..." }
    let text = translations[targetLang];

    // 3) If missing, backfill (this will produce to Kafka so compaction catches up later)
    if (text == null && targetLang !== originalLang) {
      const state = {
        messageId,
        user,
        ts,
        originalText,
        originalLang,
        translations
      };
      const updated = await ensureTranslationInRaw(chatId, state, targetLang);
      text = updated.translations[targetLang];
    }

    // 4) Emit final
    socket.emit('message', {
      messageId,
      user,
      originText:     originalText,
      translatedText: text ?? originalText,  // fallback
      originLang:     originalLang,
      targetLang,
      ts,
      replayed:       true
    });
  }
}



// server.js (excerpt)
io.on('connection', socket => {
  console.log(`🔌 Socket ${socket.id} connected`);

  // 1) User joins a chat room
  socket.on('setLanguage', async ({ chatId, userId, lang }) => {
    socket.userLang  = lang || 'en';
    console.log(`Set user ${socket.userId} lang to ${lang}`)
    try {

      await replayHistory(socket, chatId, socket.userLang);
    } catch (err) {
      console.error('❌ Error replaying history', err);
      socket.emit('error', 'Could not load chat history');
    }
  })

  socket.on('joinChat', async ({ chatId, userId, lang }) => {
    socket.chatId    = chatId;
    socket.userId    = userId;
    socket.userLang  = lang || 'en';
    socket.join(chatId);
    console.log(`➡️  Socket ${socket.id} joined chat ${chatId} (lang=${socket.userLang})`);

    // Optional: replay history here for socket.chatId & socket.userLang
    // Replay history in the chosen language
    try {
      await replayHistory(socket, chatId, socket.userLang);
    } catch (err) {
      console.error('❌ Error replaying history', err);
      socket.emit('error', 'Could not load chat history');
    }
  });

  // 2) Handle incoming messages
  socket.on('sendMessage', async ({ text, originLang }) => {
    const { chatId, userId } = socket;
    const timestamp = new Date().toISOString();
    const messageId = randomUUID();
    const rawTopic  = `chat-${chatId}`;
    const originalLang = socket.userLang
    // 1) build & persist initial state
    const rawState = {
      messageId,
      user:         userId,
      ts:           timestamp,
      originalLang,           // passed from client or derived
      originalText:  text,
      translations: { [originalLang]: text }
    };
    await producer.send({
      topic: rawTopic,
      messages: [{ key: messageId, value: JSON.stringify(rawState) }]
    });

    // 2) for each socket in room, ensure translation & emit
    const sockets = io.sockets.adapter.rooms.get(chatId) || new Set();
    for (const sid of sockets) {
      const s = io.sockets.sockets.get(sid);
      const tLang = s.userLang || originLang;
      let state = rawState;

      if (tLang !== originLang) {
        state = await ensureTranslationInRaw(chatId, state, tLang);
      }
      console.log("Emitting from sendMsg")
      s.emit('message', {
        messageId,
        user:           state.user,
        originText:     state.originalText,
        translatedText: state.translations[tLang],
        originLang:     state.originalLang,
        targetLang:     tLang,
        ts:             state.ts,

      });
    }
  });


  socket.on('disconnect', () => {
    console.log(`❌ Socket ${socket.id} disconnected`);
  });
});




async function listChatTopics() {
  const admin = kafka.admin();
  await admin.connect();
  const topics = await admin.listTopics();
  await admin.disconnect();
  // filter to only your raw chat topics
  return topics
    .filter(t => t.startsWith('chat-'))
    .map(t => t.slice('chat-'.length));  // strip the “chat-” prefix
}

app.get('/chats', async (req, res) => {
  try {
    const chatIds = await listChatTopics();
    res.json({ chats: chatIds });
  } catch (err) {
    console.error('❌ GET /chats error', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/chats', async (req, res) => {
  const admin = kafka.admin();
  const chatId   = randomUUID().slice(0,8);       // short id
  const topic    = `chat-${chatId}`;

  try {
    // 1) create the Kafka topic
    await admin.connect();
    console.log("Connected to Admin kafka")
    const created = await admin.createTopics({
      topics: [{
        topic: topic,
        numPartitions: 1,
        replicationFactor: 1,
        configEntries: [
          { name: 'cleanup.policy',    value: 'compact'    },
          { name: 'min.cleanable.dirty.ratio', value: '0.01' } // compacts aggressively
        ]
      }]
    });
    if (!created) throw new Error('topic creation failed');

    const rawStreamName    = `CHAT_${chatId.toUpperCase()}_RAW`;
    const dedupeTableName  = `CHAT_${chatId.toUpperCase()}_DEDUPE`;


const ddl = `

  -- 1) Drop old artifacts (keep the Kafka topic!)
  DROP STREAM IF EXISTS ${rawStreamName};
  DROP TABLE  IF EXISTS ${dedupeTableName};

  -- 2) Create the RAW stream on your compacted topic
  CREATE STREAM ${rawStreamName} (
    MESSAGEID    VARCHAR KEY,
    TS           VARCHAR,
    USER         VARCHAR,
    ORIGINALLANG VARCHAR,
    ORIGINALTEXT VARCHAR,
    TRANSLATIONS MAP<VARCHAR, VARCHAR>
  ) WITH (
    KAFKA_TOPIC='${topic}',
    VALUE_FORMAT='JSON'
  );

  -- 3) Build a deduped TABLE (latest value per MESSAGEID)
  CREATE TABLE ${dedupeTableName} AS
    SELECT
      MESSAGEID,
      LATEST_BY_OFFSET(TS)           AS TS,
      LATEST_BY_OFFSET(USER)         AS USER,
      LATEST_BY_OFFSET(ORIGINALLANG) AS ORIGINALLANG,
      LATEST_BY_OFFSET(ORIGINALTEXT) AS ORIGINALTEXT,
      LATEST_BY_OFFSET(TRANSLATIONS) AS TRANSLATIONS
    FROM ${rawStreamName}
    GROUP BY MESSAGEID
    EMIT CHANGES;
`;


    await axios.post(
      `${process.env.KSQLDB_URL}/ksql`,
      { ksql: ddl }
    );

    console.log("Created chatId: ", chatId)

    res.json({ chatId });
  } catch (err) {
    console.error('❌ /chats error', err);
    res.status(500).json({ error: err.message });
  } finally {
    await admin.disconnect();
  }
});


// DELETE /chats/:chatId
app.delete('/chats/:chatId', async (req, res) => {
  const admin = kafka.admin();
  const { chatId } = req.params;
  const topic        = `chat-${chatId}`;
  const rawStream    = `CHAT_${chatId.toUpperCase()}_RAW`;
  const dedupeTable  = `CHAT_${chatId.toUpperCase()}_DEDUPE`;

  try {
    // 1) Drop the ksqlDB artifacts (keep Kafka topic until we delete it below)
    const dropDDL = `
    DROP TABLE  IF EXISTS ${dedupeTable} DELETE TOPIC;
      DROP STREAM IF EXISTS ${rawStream} DELETE TOPIC;
    `;
    await axios.post(
      `${process.env.KSQLDB_URL}/ksql`,
      { ksql: dropDDL, streamsProperties: {} }
    );

    // 2) Delete the Kafka topic entirely
    await admin.connect();
    await admin.deleteTopics({ topics: [topic] });
    await admin.disconnect();

    return res.status(204).end();
  } catch (err) {
    console.error(`Failed to delete chat ${chatId}:`, err);
    return res.status(500).json({ error: err.message });
  }
});


const PORT = process.env.PORT || 4000;
// server.listen(PORT, () => {
//   console.log(`🚀 Tenant app for ${TENANT_ID} listening on :${PORT}`);
// });


(async () => {
  await producer.connect();
  console.log('✅ Kafka producer connected');
  server.listen(PORT, () => console.log(`🚀 Server listening to Kafka on :${PORT}`));
})().catch(err => console.error('Kafka startup error', err));

