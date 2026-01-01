# Start Up
``` Provisioning
cd provisioning && node src/command_center.js
```

''' Frontend App
cd tenant_client && npx expo start
```


``` backend App
cd tenant_server && docker compose up -d
cd tenant_server && node server.js
cd tenant_server && uv run translate_server.py

docker compose exec ksqldb-cli ksql http://ksqldb-server:8088
1. docker compose exec ksqldb-cli ksql http://ksqldb-server:8088
```

# Key Cloak
docker-compose up -d keycloak-db keycloak
cd keycloak && docker compose up -d

# Languages
```Add new Language
1. LanguagePicker
  - Add option

```
 # Manage Services
```Manage Services

# List Topics w/ kafka
docker exec -it local-kafka bash

kafka-topics \
  --bootstrap-server localhost:9092 \
  --list

kafka-topics \
  --bootstrap-server localhost:9092 \
  --delete \
  --topic chat-36224621


#List streams with ksqldb
docker exec -it local-ksqldb-cli ksql http://ksqldb-server:8088

SHOW STREAMS;
SHOW TABLES;
DESCRIBE <STREAM_NAME>;
SHOW QUERIES;


DROP STREAM  DELETE TOPIC;







Drop a stream (keep the underlying topic)
DROP STREAM <STREAM_NAME> DELETE TOPIC = false;
Drop a stream and delete its backing topic
DROP STREAM <STREAM_NAME> DELETE TOPIC = true;
Drop a table (materialized view) and its topic
DROP TABLE <TABLE_NAME> DELETE TOPIC;
Terminate a persistent query
TERMINATE <QUERY_ID>;

curl -X POST http://localhost:8088/query \
  -H "Content-Type: application/vnd.ksql.v1+json; charset=utf-8" \
  -d '{ "ksql":"SHOW STREAMS;", "streamsProperties":{} }'


curl -X POST http://localhost:8088/ksql \
  -H "Content-Type: application/vnd.ksql.v1+json; charset=utf-8" \
  -d '{ "ksql":"DROP STREAM my_stream DELETE TOPIC;", "streamsProperties":{} }'




```


# Project Details Below


## 1. Project Overview

A multi-tenant SaaS platform to spin up secure, dedicated AI-enabled environments on-demand. Each environment includes:

* **Web Interface** for administrative and end‑user workflows
* **Dedicated Backend** with isolation and a Trusted Execution Environment (TEE)
* **Protected Storage** for customer data
* **AI Services**: chat, data analysis, media generation
* **Secure Meeting Rooms**: real‑time multilingual chat with end‑user translation

All data in transit and at rest is fully encrypted; sensitive workloads run in hardware-backed TEEs (e.g., AWS Nitro Enclaves, Intel SGX).

---

## 2. Goals & Requirements

### 2.1 Functional Requirements

* **Environment Provisioning**: Button-click creation of new customer instance
* **Authentication & SSO**: Support enterprise-grade authentication including SAML 2.0, OpenID Connect (OIDC), OAuth 2.0, JWT-based flows, and SCIM provisioning for automated user lifecycle management. Integrations with IdPs such as Okta, Azure AD, Ping Identity, and on‑prem LDAP servers.
* **User Management**: Each company is a separate tenant. Within each tenant you can create multiple user accounts and assign one of several roles to control access, billing, and feature availability:

  * **Admin**: Full system and user management. Can create/delete accounts, change passwords, configure platform settings, and select which AI models the company may use.
  * **Tier 1**: Same operational privileges as Admin except cannot manage user accounts (no create/delete/change passwords).
  * **Tier 2**: Can invoke all AI features (chat, analysis, media gen) and upload data; cannot modify system or user settings.
  * **Tier 3**: Can invoke AI features and view data; cannot upload documents to protected storage.
  * **Tier 4**: View-only access. Can see dashboards and read outputs but cannot invoke models or incur charges.
* **Data Ingestion**: Secure upload, vault‑backed storage, audit logs
* **Model Selection & Deployment**: Pre‑built LLMs or customer‑provided models
* **AI Features**:

  * Chat interface with context persistence
  * Data analysis pipelines (e.g., classification, summarization)
  * Media generation (images, audio)
* **Secure Meeting Room**:

  * Real‑time messaging
  * Automatic translation per user preference
  * End‑to‑end encryption

### 2.2 Non‑Functional Requirements

* **Security & Compliance**: HIPAA/GDPR readiness
* **Isolation**: Tenant separation at network, compute, and storage layers
* **Scalability**: Horizontal scaling for spikes in AI inference
* **Observability**: Metrics, logging (audit‑grade)
* **Cost Efficiency**: Pay‑as‑you‑go per customer

---

## 3. High‑Level Architecture

1. **Frontend**: React/Next.js with Tailwind UI
2. **API Gateway**: AuthN/AuthZ (SAML, OIDC, OAuth 2.0, JWT, SCIM), rate limiting
3. **Orchestration**: Kubernetes + custom operator to deploy per‑tenant stacks
4. **Compute Nodes**: EC2 instances with Nitro Enclaves or SGX‑enabled servers
5. **Storage**: S3 (encrypted) + Secrets Manager or Vault for keys
6. **Model Serving**: Containers invoking models via TensorFlow/PyTorch inside enclaves
7. **Real‑Time Messaging**: WebSocket service with translation microservice (AWS Translate or self‑hosted)
8. **CI/CD**: GitOps (Argo CD) for environment templating

(Detailed block diagram to follow)

---

## 4. Technology Stack

| Layer             | Technology                               |
| ----------------- | ---------------------------------------- |
| Frontend          | React, Next.js, Tailwind CSS             |
| Backend           | Node.js/Express or Go, gRPC              |
| Orchestration     | Kubernetes, Helm, Custom Operator        |
| TEE               | AWS Nitro Enclaves / Intel SGX           |
| Storage & Secrets | S3 (AES‑256), AWS KMS / HashiCorp Vault  |
| AI Frameworks     | Hugging Face Transformers, Triton Server |
| Real‑Time Chat    | Socket.io / MQTT + Translation Service   |
| Observability     | Prometheus, Grafana, ELK Stack           |

---

## 5. MVP Roadmap

1. **Phase 0: Proof of Concept enclave‑hosted inference**

   * **Objective**: Validate secure LLM inference inside a TEE and prove remote attestation flow.
   * **Tasks**:

     1. Select a TEE platform (e.g., AWS Nitro Enclaves or Intel SGX dev kit).
     2. Containerize a lightweight open‑source LLM (e.g., GPT‑J 6B or smaller) for enclave deployment.
     3. Implement enclave startup and generate attestation quotes.
     4. Develop a minimal client prototype to verify attestation and establish an encrypted channel.
     5. Run inference inside the enclave and return encrypted responses to the client.
   * **Deliverables**:

     * Enclave image with model and attestation code.
     * Client script demonstrating attestation and encrypted prompt/response.
     * Documentation and simple architecture diagram.
   * **Success Criteria**:

     * Client verifies enclave identity and model image.
     * Encrypted inference requests complete correctly inside the TEE.
     * No sensitive plaintext (model weights or client data) exposed outside the enclave.

2. **Phase 1**: Single‑tenant provisioning UI + basic chat

3. **Phase 2**: Multi‑tenant orchestration + data upload/audit

4. **Phase 3**: Secure meeting rooms + auto‑translation

5. **Phase 4**: Compliance hardening, scaling, self‑service billing

---

## 6. Next Steps

* Finalize threat model and compliance scope
* Build POC: enclave‑based chat service
* Define IaC templates for per‑tenant stacks
* Sketch UI/UX flows for provisioning and meetings
* Set up CI/CD pipelines and basic monitoring

*Let me know which part you’d like to dive into first!*
