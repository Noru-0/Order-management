# Event Sourcing Order Management - Deployment View Mermaid Diagrams

## 📋 Tổng quan Script Mermaid cho Deployment View

File này chứa các script Mermaid để vẽ diagram cho **Deployment View** của hệ thống Event Sourcing Order Management. Các diagram bao gồm kiến trúc triển khai, network topology, CI/CD pipeline, monitoring stack và các chiến lược deployment.

---

## 🏗️ 1. Overall Deployment Architecture

### Script Mermaid
```mermaid
graph TB
    subgraph "External Users"
        USER[👤 Users/Clients]
        ADMIN[👨‍💼 Admin Dashboard]
    end
    
    subgraph "Load Balancer Layer"
        LB[🔄 Nginx Load Balancer<br/>📡 Port 80/443<br/>📊 2 cores, 4GB RAM]
    end
    
    subgraph "Application Layer"
        FE1[🖥️ Frontend Node 1<br/>⚛️ Next.js Container<br/>📡 Port 3000<br/>📊 1 core, 2GB RAM]
        FE2[🖥️ Frontend Node 2<br/>⚛️ Next.js Container<br/>📡 Port 3000<br/>📊 1 core, 2GB RAM]
        
        BE1[⚙️ Backend Node 1<br/>🟢 Express.js Container<br/>📡 Port 3001<br/>📊 2 cores, 4GB RAM]
        BE2[⚙️ Backend Node 2<br/>🟢 Express.js Container<br/>📡 Port 3001<br/>📊 2 cores, 4GB RAM]
    end
    
    subgraph "Data Layer"
        DB1[🗄️ PostgreSQL Primary<br/>📝 Event Store<br/>📡 Port 5432<br/>📊 4 cores, 16GB RAM]
        DB2[🗄️ PostgreSQL Replica<br/>📖 Read-only<br/>📡 Port 5432<br/>📊 2 cores, 8GB RAM]
        
        REDIS[⚡ Redis Cache<br/>💾 Session & Projections<br/>📡 Port 6379<br/>📊 1 core, 8GB RAM]
    end
    
    subgraph "Infrastructure Layer"
        MON[📊 Monitoring Stack<br/>📈 Prometheus + Grafana<br/>📡 Port 9090/3000<br/>📊 2 cores, 8GB RAM]
        LOG[📝 Logging Stack<br/>🔍 ELK Stack<br/>📡 Port 5601<br/>📊 2 cores, 8GB RAM]
    end
    
    %% External connections
    USER -->|HTTPS/443| LB
    ADMIN -->|HTTPS/443| LB
    
    %% Load balancer to application layer
    LB -->|HTTP/3000| FE1
    LB -->|HTTP/3000| FE2
    LB -->|HTTP/3001| BE1
    LB -->|HTTP/3001| BE2
    
    %% Frontend to backend
    FE1 -->|API calls| BE1
    FE2 -->|API calls| BE2
    
    %% Backend to data layer
    BE1 -->|Write/Read| DB1
    BE2 -->|Write/Read| DB1
    BE1 -->|Read only| DB2
    BE2 -->|Read only| DB2
    BE1 -->|Cache ops| REDIS
    BE2 -->|Cache ops| REDIS
    
    %% Monitoring connections
    BE1 -.->|Metrics| MON
    BE2 -.->|Metrics| MON
    DB1 -.->|Metrics| MON
    DB2 -.->|Metrics| MON
    REDIS -.->|Metrics| MON
    
    %% Logging connections
    FE1 -.->|Logs| LOG
    FE2 -.->|Logs| LOG
    BE1 -.->|Logs| LOG
    BE2 -.->|Logs| LOG
    DB1 -.->|Logs| LOG
    DB2 -.->|Logs| LOG
    
    %% Database replication
    DB1 ==>|Streaming<br/>Replication| DB2
    
    %% Styling
    classDef userClass fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef lbClass fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef appClass fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px
    classDef dataClass fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef infraClass fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    
    class USER,ADMIN userClass
    class LB lbClass
    class FE1,FE2,BE1,BE2 appClass
    class DB1,DB2,REDIS dataClass
    class MON,LOG infraClass
```

### Mô tả sử dụng:
- **Mục đích**: Hiển thị tổng quan kiến trúc triển khai với tất cả các node và kết nối
- **Thành phần chính**: Load balancer, application layer, data layer, infrastructure layer
- **Thông tin hiển thị**: Ports, resource specifications, connection types
- **Sử dụng**: Architecture overview, system documentation, stakeholder presentations

---

## 🌍 2. Multi-Environment Deployment Strategy

### Script Mermaid
```mermaid
graph LR
    subgraph "Development Environment"
        DEV_LOCAL[💻 Local Development<br/>localhost:3000/3001<br/>📊 Single machine]
        DEV_DB[🗄️ Local PostgreSQL<br/>localhost:5432<br/>📊 Development data]
    end
    
    subgraph "Staging Environment"
        STAGE_DOCKER[🐳 Docker Compose<br/>staging.domain.com<br/>📊 2 replicas each]
        STAGE_LB[🔄 Nginx Container<br/>Load balancing]
        STAGE_DB[🗄️ PostgreSQL Container<br/>Production-like data]
        STAGE_REDIS[⚡ Redis Container<br/>Cache testing]
    end
    
    subgraph "Production Environment"
        PROD_K8S[☸️ Kubernetes Cluster<br/>production.domain.com<br/>📊 3+ replicas each]
        PROD_INGRESS[🌐 Ingress Controller<br/>SSL termination]
        PROD_DB[🗄️ PostgreSQL StatefulSet<br/>Master/Replica setup]
        PROD_REDIS[⚡ Redis Deployment<br/>High availability]
        PROD_MON[📊 Full Monitoring<br/>Prometheus/Grafana]
    end
    
    subgraph "Cloud-native Future"
        CLOUD_CDN[☁️ CDN + S3<br/>Static assets]
        CLOUD_MANAGED[☁️ Managed Services<br/>RDS, ElastiCache]
        CLOUD_SERVERLESS[⚡ Serverless Functions<br/>Event processing]
        CLOUD_STREAM[🌊 Event Streaming<br/>EventBridge/Event Hubs]
    end
    
    %% Environment progression
    DEV_LOCAL ==>|Code commit<br/>CI/CD trigger| STAGE_DOCKER
    STAGE_DOCKER ==>|Testing passed<br/>Manual approval| PROD_K8S
    PROD_K8S -.->|Future migration| CLOUD_CDN
    
    %% Internal connections
    DEV_LOCAL --- DEV_DB
    STAGE_LB --- STAGE_DOCKER
    STAGE_DOCKER --- STAGE_DB
    STAGE_DOCKER --- STAGE_REDIS
    
    PROD_INGRESS --- PROD_K8S
    PROD_K8S --- PROD_DB
    PROD_K8S --- PROD_REDIS
    PROD_K8S --- PROD_MON
    
    CLOUD_CDN --- CLOUD_MANAGED
    CLOUD_MANAGED --- CLOUD_SERVERLESS
    CLOUD_SERVERLESS --- CLOUD_STREAM
    
    %% Styling
    classDef devClass fill:#e3f2fd,stroke:#0d47a1,stroke-width:2px
    classDef stageClass fill:#fff8e1,stroke:#e65100,stroke-width:2px
    classDef prodClass fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px
    classDef cloudClass fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    
    class DEV_LOCAL,DEV_DB devClass
    class STAGE_DOCKER,STAGE_LB,STAGE_DB,STAGE_REDIS stageClass
    class PROD_K8S,PROD_INGRESS,PROD_DB,PROD_REDIS,PROD_MON prodClass
    class CLOUD_CDN,CLOUD_MANAGED,CLOUD_SERVERLESS,CLOUD_STREAM cloudClass
```

### Mô tả sử dụng:
- **Mục đích**: Hiển thị chiến lược triển khai qua các môi trường
- **Thành phần**: Development, Staging, Production, Cloud-native future
- **Flow**: Code progression từ development đến production
- **Sử dụng**: DevOps planning, environment strategy, team alignment

---

## 🔗 3. Network Communication & Security Topology

### Script Mermaid
```mermaid
graph TB
    subgraph "Public Internet (0.0.0.0/0)"
        INET[🌐 Internet Users<br/>External Traffic]
    end
    
    subgraph "DMZ Zone (10.0.1.0/24)"
        LB[🔄 Load Balancer<br/>📡 443/80<br/>🔒 SSL Termination]
        CDN[⚡ CDN Endpoints<br/>📦 Static Assets<br/>🔒 DDoS Protection]
    end
    
    subgraph "Application Zone - Frontend (10.0.2.0/24)"
        FE[🖥️ Frontend Services<br/>📡 3000<br/>🔒 No direct internet access]
    end
    
    subgraph "Application Zone - Backend (10.0.3.0/24)"
        BE[⚙️ Backend Services<br/>📡 3001<br/>🔒 API Gateway protected]
    end
    
    subgraph "Data Zone (10.0.4.0/24)"
        DB[🗄️ Database Cluster<br/>📡 5432<br/>🔒 Restricted access only]
        CACHE[⚡ Cache Layer<br/>📡 6379<br/>🔒 Internal network only]
    end
    
    subgraph "Management Zone (10.0.5.0/24)"
        MON[📊 Monitoring<br/>📡 9090<br/>🔒 Admin access only]
        LOG[📝 Logging<br/>📡 5601<br/>🔒 Audit trail]
        JUMP[🚪 Jump Host<br/>📡 22<br/>🔒 SSH bastion]
    end
    
    %% Public traffic flows
    INET -->|HTTPS/443<br/>🔒 TLS 1.3| LB
    INET -->|HTTP/80<br/>➡️ Redirect 443| CDN
    
    %% DMZ to application zones
    LB -->|HTTP/3000<br/>🔒 Internal TLS| FE
    LB -->|HTTP/3001<br/>🔒 Internal TLS| BE
    CDN -->|HTTP/3000<br/>📦 Assets only| FE
    
    %% Application layer communication
    FE -->|HTTP/3001<br/>🔒 Service mesh| BE
    
    %% Backend to data layer
    BE -->|TCP/5432<br/>🔒 Encrypted conn| DB
    BE -->|TCP/6379<br/>🔒 AUTH required| CACHE
    
    %% Management access
    BE -.->|HTTP/9090<br/>📊 Metrics| MON
    FE -.->|HTTP/9090<br/>📊 Metrics| MON
    DB -.->|HTTP/9090<br/>📊 Metrics| MON
    
    BE -.->|Syslog/514<br/>📝 Structured logs| LOG
    FE -.->|Syslog/514<br/>📝 Access logs| LOG
    DB -.->|Syslog/514<br/>📝 Audit logs| LOG
    
    JUMP -.->|SSH/22<br/>🔒 Key-based auth| DB
    JUMP -.->|SSH/22<br/>🔒 Admin access| MON
    
    %% Firewall rules annotations
    LB -.->|🚫 Deny all other<br/>inbound traffic| INET
    FE -.->|🚫 No direct<br/>internet access| INET
    BE -.->|🚫 No direct<br/>internet access| INET
    DB -.->|🚫 Restricted access<br/>from Backend only| BE
    
    %% Styling
    classDef internetClass fill:#ffebee,stroke:#c62828,stroke-width:3px
    classDef dmzClass fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef appClass fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    classDef dataClass fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
    classDef mgmtClass fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    
    class INET internetClass
    class LB,CDN dmzClass
    class FE,BE appClass
    class DB,CACHE dataClass
    class MON,LOG,JUMP mgmtClass
```

### Mô tả sử dụng:
- **Mục đích**: Hiển thị network topology và security boundaries
- **Thành phần**: Network zones, firewall rules, communication protocols
- **Security**: Access controls, encryption, network segmentation
- **Sử dụng**: Security planning, network design, compliance documentation

---

## 🚀 4. CI/CD Pipeline Architecture

### Script Mermaid
```mermaid
graph LR
    subgraph "Source Control"
        GIT[📚 GitHub Repository<br/>🔀 Main/Develop branches<br/>📝 Pull requests]
    end
    
    subgraph "CI Pipeline"
        BUILD[🔨 Build & Test<br/>⚡ Node.js 18<br/>🧪 Unit/Integration tests]
        SCAN[🛡️ Security Scan<br/>🔍 Vulnerability check<br/>📋 Code quality]
        IMG[📦 Build Images<br/>🐳 Docker build<br/>🏷️ Tag & version]
    end
    
    subgraph "Artifact Storage"
        REG[📁 Container Registry<br/>🐳 GitHub Container Registry<br/>🏷️ ghcr.io/repo/image:tag]
    end
    
    subgraph "CD Pipeline"
        DEV[🚀 Deploy to Dev<br/>💻 Local/Docker Compose<br/>⚡ Instant deployment]
        STAGE[🧪 Deploy to Staging<br/>🐳 Docker Swarm<br/>✅ Smoke tests]
        APPROVAL[✋ Manual Approval<br/>👨‍💼 Product owner review<br/>📋 Release checklist]
        PROD[🌟 Deploy to Production<br/>☸️ Kubernetes cluster<br/>🔄 Rolling update]
    end
    
    subgraph "Infrastructure"
        K8S[☸️ Kubernetes Cluster<br/>🏷️ Namespaces: dev/staging/prod<br/>⚖️ Auto-scaling enabled]
        MON[📊 Monitoring<br/>📈 Prometheus/Grafana<br/>🚨 Alerting rules]
    end
    
    subgraph "Notifications"
        SLACK[💬 Slack Notifications<br/>✅ Success alerts<br/>❌ Failure alerts]
        EMAIL[📧 Email Alerts<br/>👨‍💼 Stakeholder updates<br/>📊 Weekly reports]
    end
    
    %% CI Flow
    GIT -->|Webhook trigger<br/>🔔 Push/PR events| BUILD
    BUILD -->|Tests passed<br/>✅ Quality gates| SCAN
    SCAN -->|Security cleared<br/>🛡️ No vulnerabilities| IMG
    IMG -->|Image pushed<br/>📦 Artifact created| REG
    
    %% CD Flow
    REG -->|Auto deploy<br/>⚡ Development| DEV
    DEV -->|Deploy on merge<br/>🔀 Main branch| STAGE
    STAGE -->|Manual gate<br/>✋ Human approval| APPROVAL
    APPROVAL -->|Approved<br/>✅ Go live| PROD
    
    %% Infrastructure
    PROD -->|Deployment<br/>☸️ Rolling update| K8S
    K8S -->|Health checks<br/>💓 Readiness probes| MON
    
    %% Feedback loops
    MON -.->|Metrics<br/>📊 Performance data| SLACK
    STAGE -.->|Test results<br/>🧪 Validation report| EMAIL
    PROD -.->|Deployment status<br/>🚀 Go-live notification| SLACK
    
    %% Error flows
    BUILD -.->|Build failed<br/>❌ Test failures| SLACK
    SCAN -.->|Security issues<br/>🚨 Vulnerabilities found| EMAIL
    PROD -.->|Deployment failed<br/>💥 Rollback triggered| SLACK
    
    %% Styling
    classDef sourceClass fill:#e3f2fd,stroke:#0d47a1,stroke-width:2px
    classDef ciClass fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px
    classDef artifactClass fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef cdClass fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef infraClass fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    classDef notifClass fill:#e0f2f1,stroke:#00695c,stroke-width:2px
    
    class GIT sourceClass
    class BUILD,SCAN,IMG ciClass
    class REG artifactClass
    class DEV,STAGE,APPROVAL,PROD cdClass
    class K8S,MON infraClass
    class SLACK,EMAIL notifClass
```

### Mô tả sử dụng:
- **Mục đích**: Hiển thị end-to-end CI/CD pipeline workflow
- **Thành phần**: Source control, CI stages, CD environments, infrastructure
- **Flow**: Code to production deployment process
- **Sử dụng**: DevOps documentation, process training, pipeline optimization

---

## 📊 5. Monitoring & Observability Stack

### Script Mermaid
```mermaid
graph TB
    subgraph "Application Layer"
        APP[🖥️ Applications<br/>Frontend + Backend<br/>📊 Custom metrics]
        DB[🗄️ Database<br/>PostgreSQL cluster<br/>📈 Query performance]
        CACHE[⚡ Cache<br/>Redis cluster<br/>💾 Hit/miss ratios]
    end
    
    subgraph "Metrics Collection Layer"
        PROM[📊 Prometheus<br/>📈 Time-series DB<br/>⏱️ 15s scrape interval]
        NODE[🖥️ Node Exporter<br/>📋 System metrics<br/>💻 CPU/Memory/Disk]
        PG_EXP[🗄️ PostgreSQL Exporter<br/>📊 DB metrics<br/>🔗 Connection pools]
        REDIS_EXP[⚡ Redis Exporter<br/>📈 Cache metrics<br/>⚡ Performance stats]
    end
    
    subgraph "Logging Stack"
        LOG_AGG[📝 Log Aggregator<br/>🌊 Fluentd/Fluent Bit<br/>📦 Log shipping]
        ES[🔍 Elasticsearch<br/>📚 Log storage<br/>🔎 Full-text search]
        KIBANA[📊 Kibana<br/>📈 Log visualization<br/>🔍 Query interface]
    end
    
    subgraph "Visualization & Alerting"
        GRAFANA[📊 Grafana<br/>📈 Dashboards<br/>📊 Real-time charts]
        ALERT[🚨 Alertmanager<br/>📢 Notification routing<br/>🔄 Alert grouping]
    end
    
    subgraph "External Integrations"
        SLACK[💬 Slack<br/>📢 Team notifications<br/>🤖 Bot integrations]
        EMAIL[📧 Email<br/>📨 Alert emails<br/>📋 Daily reports]
        PAGER[📟 PagerDuty<br/>🚨 On-call alerts<br/>📞 Escalation policies]
        WEBHOOK[🔗 Webhooks<br/>🔄 Custom integrations<br/>⚡ Real-time events]
    end
    
    %% Metrics flow
    APP -->|/metrics endpoint<br/>📊 HTTP metrics| PROM
    DB -->|Database stats<br/>📈 Performance data| PG_EXP
    CACHE -->|Cache statistics<br/>⚡ Redis INFO| REDIS_EXP
    NODE -->|System metrics<br/>💻 Host statistics| PROM
    
    PG_EXP -->|Scraped metrics<br/>📊 30s interval| PROM
    REDIS_EXP -->|Cache metrics<br/>📈 30s interval| PROM
    
    %% Logging flow
    APP -->|Application logs<br/>📝 JSON format| LOG_AGG
    DB -->|Query logs<br/>🗄️ Slow queries| LOG_AGG
    CACHE -->|Redis logs<br/>⚡ Command logs| LOG_AGG
    
    LOG_AGG -->|Processed logs<br/>📦 Structured data| ES
    ES -->|Search & analytics<br/>🔍 Log analysis| KIBANA
    
    %% Visualization flow
    PROM -->|Query API<br/>📊 PromQL queries| GRAFANA
    PROM -->|Alert rules<br/>🚨 Threshold checks| ALERT
    
    %% Notification flow
    ALERT -->|Critical alerts<br/>🚨 P0/P1 incidents| PAGER
    ALERT -->|Team notifications<br/>💬 Channel alerts| SLACK
    ALERT -->|Management alerts<br/>📧 Executive summary| EMAIL
    ALERT -->|Custom webhooks<br/>🔗 Integration hooks| WEBHOOK
    
    %% Cross-stack integration
    GRAFANA -.->|Dashboard links<br/>🔗 Log correlation| KIBANA
    KIBANA -.->|Alert on logs<br/>📝 Log-based alerts| ALERT
    SLACK -.->|Interactive alerts<br/>🤖 Acknowledge/Resolve| ALERT
    
    %% Data flow styling
    APP -.->|Health checks<br/>💓 Liveness probes| GRAFANA
    GRAFANA -.->|SLA monitoring<br/>📊 Service quality| SLACK
    
    %% Styling
    classDef appClass fill:#e3f2fd,stroke:#0d47a1,stroke-width:2px
    classDef metricsClass fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px
    classDef loggingClass fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef visualClass fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef notifClass fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    
    class APP,DB,CACHE appClass
    class PROM,NODE,PG_EXP,REDIS_EXP metricsClass
    class LOG_AGG,ES,KIBANA loggingClass
    class GRAFANA,ALERT visualClass
    class SLACK,EMAIL,PAGER,WEBHOOK notifClass
```

### Mô tả sử dụng:
- **Mục đích**: Hiển thị complete observability stack architecture
- **Thành phần**: Metrics, logs, visualization, alerting, notifications
- **Data flow**: Collection → Processing → Visualization → Alerting
- **Sử dụng**: Monitoring strategy, incident response, performance optimization

---

## 🔄 6. Container Orchestration & Deployment Strategies

### Script Mermaid
```mermaid
graph TB
    subgraph "Development Strategy"
        DEV_COMPOSE[🐳 Docker Compose<br/>📁 docker-compose.dev.yml<br/>🔧 Hot reload enabled]
        DEV_VOLUMES[📁 Volume Mounts<br/>🔄 Source code sync<br/>⚡ Instant updates]
    end
    
    subgraph "Staging Strategy"
        STAGE_SWARM[🐝 Docker Swarm<br/>📦 Multi-container orchestration<br/>⚖️ Load balancing]
        STAGE_SECRETS[🔐 Docker Secrets<br/>🗝️ Password management<br/>🔒 Encrypted storage]
    end
    
    subgraph "Production Strategy - Blue/Green"
        PROD_BLUE[🔵 Blue Environment<br/>☸️ Current production<br/>👥 Active traffic]
        PROD_GREEN[🟢 Green Environment<br/>☸️ New deployment<br/>🧪 Testing phase]
        PROD_SWITCH[🔄 Traffic Switch<br/>⚡ Instant cutover<br/>🔙 Quick rollback]
    end
    
    subgraph "Production Strategy - Canary"
        CANARY_OLD[📦 Stable Version<br/>👥 80% traffic<br/>✅ Proven stable]
        CANARY_NEW[🆕 New Version<br/>👥 20% traffic<br/>📊 Performance monitoring]
        CANARY_CONTROL[🎛️ Traffic Control<br/>📊 Gradual rollout<br/>🚨 Auto rollback]
    end
    
    subgraph "Kubernetes Infrastructure"
        K8S_MASTER[☸️ Master Nodes<br/>🎛️ Control plane<br/>📋 API server]
        K8S_WORKER[💪 Worker Nodes<br/>🏃‍♂️ Pod execution<br/>📦 Container runtime]
        K8S_INGRESS[🌐 Ingress Controller<br/>🔄 Load balancing<br/>🔒 SSL termination]
        K8S_STORAGE[💾 Persistent Storage<br/>📁 StatefulSets<br/>🔄 Volume management]
    end
    
    subgraph "Auto-scaling & Health"
        HPA[📈 Horizontal Pod Autoscaler<br/>⚖️ CPU/Memory based<br/>🔄 Dynamic scaling]
        VPA[📊 Vertical Pod Autoscaler<br/>📈 Resource optimization<br/>💡 Right-sizing]
        HEALTH[💓 Health Checks<br/>🩺 Liveness probes<br/>✅ Readiness probes]
        CIRCUIT[🔌 Circuit Breakers<br/>🛡️ Failure isolation<br/>🔄 Auto recovery]
    end
    
    %% Development flow
    DEV_COMPOSE <--> DEV_VOLUMES
    
    %% Staging flow
    STAGE_SWARM --> STAGE_SECRETS
    
    %% Blue/Green flow
    PROD_BLUE <-->|🔄 Switch traffic| PROD_SWITCH
    PROD_GREEN <-->|🔄 Switch traffic| PROD_SWITCH
    PROD_SWITCH -.->|🔙 Rollback if needed| PROD_BLUE
    
    %% Canary flow
    CANARY_OLD <-->|📊 Traffic split| CANARY_CONTROL
    CANARY_NEW <-->|📊 Traffic split| CANARY_CONTROL
    CANARY_CONTROL -.->|🚨 Issues detected| CANARY_OLD
    
    %% Kubernetes architecture
    K8S_MASTER -->|🎛️ Orchestration| K8S_WORKER
    K8S_WORKER -->|🌐 Service mesh| K8S_INGRESS
    K8S_WORKER -->|💾 Data persistence| K8S_STORAGE
    
    %% Auto-scaling integration
    K8S_WORKER <-->|📈 Scale pods| HPA
    K8S_WORKER <-->|📊 Optimize resources| VPA
    K8S_WORKER <-->|💓 Monitor health| HEALTH
    K8S_WORKER <-->|🛡️ Handle failures| CIRCUIT
    
    %% Strategy progression
    DEV_COMPOSE ==>|🚀 Promote| STAGE_SWARM
    STAGE_SWARM ==>|✅ Validated| PROD_BLUE
    STAGE_SWARM ==>|✅ Validated| CANARY_OLD
    
    %% Infrastructure dependencies
    PROD_BLUE -.->|☸️ Runs on| K8S_WORKER
    PROD_GREEN -.->|☸️ Runs on| K8S_WORKER
    CANARY_OLD -.->|☸️ Runs on| K8S_WORKER
    CANARY_NEW -.->|☸️ Runs on| K8S_WORKER
    
    %% Styling
    classDef devClass fill:#e3f2fd,stroke:#0d47a1,stroke-width:2px
    classDef stageClass fill:#fff8e1,stroke:#e65100,stroke-width:2px
    classDef blueGreenClass fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px
    classDef canaryClass fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef k8sClass fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    classDef autoClass fill:#e0f2f1,stroke:#00695c,stroke-width:2px
    
    class DEV_COMPOSE,DEV_VOLUMES devClass
    class STAGE_SWARM,STAGE_SECRETS stageClass
    class PROD_BLUE,PROD_GREEN,PROD_SWITCH blueGreenClass
    class CANARY_OLD,CANARY_NEW,CANARY_CONTROL canaryClass
    class K8S_MASTER,K8S_WORKER,K8S_INGRESS,K8S_STORAGE k8sClass
    class HPA,VPA,HEALTH,CIRCUIT autoClass
```

### Mô tả sử dụng:
- **Mục đích**: Hiển thị container orchestration và deployment strategies
- **Thành phần**: Development, staging, production strategies, Kubernetes infrastructure
- **Strategies**: Blue/Green, Canary deployments, auto-scaling
- **Sử dụng**: Deployment planning, risk mitigation, infrastructure design

---

## 🔄 7. Backup & Disaster Recovery Architecture

### Script Mermaid
```mermaid
graph TB
    subgraph "Production Environment"
        PROD_DB[🗄️ PostgreSQL Primary<br/>📝 Live event store<br/>💾 500GB SSD]
        PROD_REPLICA[🗄️ PostgreSQL Replica<br/>📖 Read-only copy<br/>🔄 Streaming replication]
        PROD_REDIS[⚡ Redis Primary<br/>💾 Cache & sessions<br/>📦 AOF persistence]
        PROD_CONFIG[⚙️ Application Config<br/>☸️ Kubernetes manifests<br/>🔧 Environment settings]
    end
    
    subgraph "Backup Storage"
        LOCAL_BACKUP[💾 Local Backup<br/>📁 /backups directory<br/>⏰ Daily full backup]
        CLOUD_S3[☁️ AWS S3 Bucket<br/>🌍 Cross-region replication<br/>🔐 Encrypted storage]
        CLOUD_GLACIER[🧊 AWS Glacier<br/>📦 Long-term archive<br/>💰 Cost-optimized]
    end
    
    subgraph "Backup Operations"
        FULL_BACKUP[📦 Full Database Backup<br/>🕐 Daily at 02:00 UTC<br/>📊 pg_dump + compression]
        WAL_BACKUP[📝 WAL Archive<br/>⏰ Every 15 minutes<br/>📈 Continuous backup]
        CONFIG_BACKUP[⚙️ Configuration Backup<br/>🕐 Daily at 03:00 UTC<br/>📋 K8s manifests + configs]
        REDIS_BACKUP[⚡ Redis Snapshot<br/>🕕 Every 6 hours<br/>💾 RDB + AOF files]
    end
    
    subgraph "Disaster Recovery Site"
        DR_REGION[🌍 DR Region<br/>🏗️ Standby infrastructure<br/>🚀 Quick activation]
        DR_DB[🗄️ Standby Database<br/>📊 Last backup restored<br/>⏱️ RTO: 1 hour]
        DR_APP[🖥️ Standby Applications<br/>☸️ Scaled-down cluster<br/>🔄 Auto-scaling ready]
        DR_MONITOR[📊 DR Monitoring<br/>🚨 Health checks<br/>📱 Alert on failures]
    end
    
    subgraph "Recovery Procedures"
        RTO_TARGET[⏱️ RTO Target<br/>🎯 1 hour recovery<br/>📊 99.9% uptime SLA]
        RPO_TARGET[📊 RPO Target<br/>🎯 15 minutes data loss<br/>📈 WAL-based recovery]
        AUTO_FAILOVER[🔄 Auto Failover<br/>🤖 Automated detection<br/>⚡ Instant switchover]
        MANUAL_RECOVERY[👨‍💻 Manual Recovery<br/>📋 Step-by-step procedures<br/>✅ Validation checklist]
    end
    
    %% Backup flows
    PROD_DB -->|📦 Daily backup<br/>🕐 02:00 UTC| FULL_BACKUP
    PROD_DB -->|📝 WAL streaming<br/>⏰ Every 15min| WAL_BACKUP
    PROD_REPLICA -->|📊 Replica backup<br/>🔄 Offload primary| FULL_BACKUP
    PROD_REDIS -->|💾 RDB snapshot<br/>🕕 Every 6h| REDIS_BACKUP
    PROD_CONFIG -->|⚙️ Config export<br/>🕐 Daily| CONFIG_BACKUP
    
    %% Storage flows
    FULL_BACKUP -->|📁 Local storage<br/>💾 Immediate access| LOCAL_BACKUP
    WAL_BACKUP -->|📁 Local archive<br/>📝 WAL files| LOCAL_BACKUP
    CONFIG_BACKUP -->|📁 Local storage<br/>⚙️ Manifest files| LOCAL_BACKUP
    REDIS_BACKUP -->|📁 Local storage<br/>💾 Redis dumps| LOCAL_BACKUP
    
    LOCAL_BACKUP -->|☁️ Cloud sync<br/>🔄 Hourly upload| CLOUD_S3
    CLOUD_S3 -->|🧊 Archive transition<br/>📅 30 days retention| CLOUD_GLACIER
    
    %% DR flows
    CLOUD_S3 -->|🌍 Cross-region<br/>🔄 Replication| DR_REGION
    DR_REGION -->|🗄️ Restore database<br/>📊 Latest backup| DR_DB
    DR_REGION -->|🖥️ Deploy apps<br/>☸️ Kubernetes| DR_APP
    DR_REGION -->|📊 Monitor status<br/>🚨 Health checks| DR_MONITOR
    
    %% Recovery procedures
    DR_MONITOR -->|⏱️ Meet RTO<br/>🎯 1 hour target| RTO_TARGET
    WAL_BACKUP -->|📊 Meet RPO<br/>🎯 15min target| RPO_TARGET
    DR_MONITOR -->|🤖 Auto detection<br/>⚡ Failover trigger| AUTO_FAILOVER
    DR_DB -->|👨‍💻 Manual steps<br/>📋 Recovery guide| MANUAL_RECOVERY
    
    %% Testing and validation
    DR_DB -.->|🧪 Monthly test<br/>✅ Restore validation| FULL_BACKUP
    DR_APP -.->|🧪 Quarterly DR drill<br/>📊 Full system test| DR_MONITOR
    AUTO_FAILOVER -.->|🧪 Semi-annual test<br/>⚡ Failover validation| DR_REGION
    
    %% Styling
    classDef prodClass fill:#e3f2fd,stroke:#0d47a1,stroke-width:2px
    classDef backupClass fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px
    classDef storageClass fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef drClass fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef recoveryClass fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    
    class PROD_DB,PROD_REPLICA,PROD_REDIS,PROD_CONFIG prodClass
    class FULL_BACKUP,WAL_BACKUP,CONFIG_BACKUP,REDIS_BACKUP backupClass
    class LOCAL_BACKUP,CLOUD_S3,CLOUD_GLACIER storageClass
    class DR_REGION,DR_DB,DR_APP,DR_MONITOR drClass
    class RTO_TARGET,RPO_TARGET,AUTO_FAILOVER,MANUAL_RECOVERY recoveryClass
```

### Mô tả sử dụng:
- **Mục đích**: Hiển thị comprehensive backup và disaster recovery strategy
- **Thành phần**: Production systems, backup operations, storage layers, DR site
- **Recovery**: RTO/RPO targets, automated and manual procedures
- **Sử dụng**: Business continuity planning, compliance documentation, DR testing

---

## 🎯 8. Resource Allocation & Scaling Architecture

### Script Mermaid
```mermaid
graph TB
    subgraph "Resource Specifications"
        LOAD_BALANCER[🔄 Load Balancer<br/>📊 2 cores, 4GB RAM<br/>📡 1Gbps network<br/>💾 20GB SSD]
        FRONTEND[🖥️ Frontend Pods<br/>📊 1 core, 2GB RAM each<br/>🔢 2-5 replicas<br/>📦 10GB storage]
        BACKEND[⚙️ Backend Pods<br/>📊 2 cores, 4GB RAM each<br/>🔢 2-5 replicas<br/>📦 10GB storage]
        DATABASE[🗄️ Database Primary<br/>📊 4 cores, 16GB RAM<br/>💾 500GB SSD<br/>🔌 High-speed network]
        REPLICA[🗄️ Database Replica<br/>📊 2 cores, 8GB RAM each<br/>🔢 2 instances<br/>💾 500GB SSD sync]
        REDIS_CACHE[⚡ Redis Cache<br/>📊 1 core, 8GB RAM<br/>💾 50GB persistence<br/>🔄 Memory optimization]
        MONITORING[📊 Monitoring Stack<br/>📊 2 cores, 8GB RAM<br/>💾 200GB metrics/logs<br/>🔗 Full cluster access]
    end
    
    subgraph "Auto-scaling Policies"
        HPA_FRONTEND[📈 Frontend HPA<br/>🎯 Target: 70% CPU<br/>📊 Min: 2, Max: 10<br/>⏱️ Scale up: 30s]
        HPA_BACKEND[📈 Backend HPA<br/>🎯 Target: 80% CPU<br/>📊 Min: 2, Max: 8<br/>⏱️ Scale up: 30s]
        VPA_POLICIES[📊 VPA Recommendations<br/>💡 Resource right-sizing<br/>📈 Historical analysis<br/>🔄 Auto-adjustment]
        CLUSTER_AUTO[☸️ Cluster Autoscaler<br/>🏗️ Node pool scaling<br/>📊 Resource requests<br/>💰 Cost optimization]
    end
    
    subgraph "Performance Thresholds"
        CPU_THRESHOLDS[💻 CPU Thresholds<br/>🟢 Normal: <70%<br/>🟡 Warning: 70-85%<br/>🔴 Critical: >85%]
        MEMORY_THRESHOLDS[🧠 Memory Thresholds<br/>🟢 Normal: <80%<br/>🟡 Warning: 80-90%<br/>🔴 Critical: >90%]
        NETWORK_THRESHOLDS[📡 Network Thresholds<br/>🟢 Normal: <500Mbps<br/>🟡 Warning: 500-800Mbps<br/>🔴 Critical: >800Mbps]
        DISK_THRESHOLDS[💾 Disk Thresholds<br/>🟢 Normal: <75%<br/>🟡 Warning: 75-90%<br/>🔴 Critical: >90%]
    end
    
    subgraph "Scaling Triggers"
        TRAFFIC_SPIKE[📈 Traffic Spike<br/>🚀 Sudden load increase<br/>⚡ Auto-scale trigger<br/>📊 Response time SLA]
        RESOURCE_PRESSURE[💥 Resource Pressure<br/>📊 High CPU/Memory<br/>🔄 Scale-out trigger<br/>⚖️ Load distribution]
        SCHEDULED_SCALE[⏰ Scheduled Scaling<br/>📅 Predictable patterns<br/>🏢 Business hours<br/>📊 Proactive scaling]
        COST_OPTIMIZATION[💰 Cost Optimization<br/>📉 Low usage periods<br/>🔽 Scale-down trigger<br/>💡 Resource efficiency]
    end
    
    subgraph "Scaling Actions"
        SCALE_OUT[📈 Scale Out<br/>➕ Add more pods<br/>⚖️ Distribute load<br/>⏱️ Horizontal scaling]
        SCALE_UP[📊 Scale Up<br/>⬆️ Increase resources<br/>💪 More CPU/RAM<br/>⏱️ Vertical scaling]
        SCALE_DOWN[📉 Scale Down<br/>➖ Remove pods<br/>💰 Reduce costs<br/>⏱️ Graceful shutdown]
        SCALE_IN[📊 Scale In<br/>⬇️ Decrease resources<br/>💡 Right-sizing<br/>⏱️ Resource optimization]
    end
    
    %% Resource allocation flows
    LOAD_BALANCER -.->|🔄 Routes traffic| FRONTEND
    LOAD_BALANCER -.->|🔄 Routes traffic| BACKEND
    FRONTEND -.->|📞 API calls| BACKEND
    BACKEND -.->|📊 Read/Write| DATABASE
    BACKEND -.->|📖 Read queries| REPLICA
    BACKEND -.->|⚡ Cache ops| REDIS_CACHE
    MONITORING -.->|📊 Observes all| DATABASE
    
    %% Auto-scaling relationships
    FRONTEND <-->|📈 Scales based on| HPA_FRONTEND
    BACKEND <-->|📈 Scales based on| HPA_BACKEND
    FRONTEND <-->|💡 Optimizes| VPA_POLICIES
    BACKEND <-->|💡 Optimizes| VPA_POLICIES
    CLUSTER_AUTO -.->|🏗️ Provisions nodes| FRONTEND
    CLUSTER_AUTO -.->|🏗️ Provisions nodes| BACKEND
    
    %% Threshold monitoring
    FRONTEND -.->|📊 CPU monitoring| CPU_THRESHOLDS
    BACKEND -.->|🧠 Memory monitoring| MEMORY_THRESHOLDS
    DATABASE -.->|📡 Network monitoring| NETWORK_THRESHOLDS
    REPLICA -.->|💾 Disk monitoring| DISK_THRESHOLDS
    
    %% Scaling triggers
    TRAFFIC_SPIKE -->|🚀 Triggers| SCALE_OUT
    RESOURCE_PRESSURE -->|💥 Triggers| SCALE_UP
    SCHEDULED_SCALE -->|⏰ Triggers| SCALE_OUT
    COST_OPTIMIZATION -->|💰 Triggers| SCALE_DOWN
    
    %% Scaling actions
    HPA_FRONTEND -->|📈 Executes| SCALE_OUT
    HPA_BACKEND -->|📈 Executes| SCALE_OUT
    VPA_POLICIES -->|📊 Executes| SCALE_UP
    VPA_POLICIES -->|📊 Executes| SCALE_IN
    
    %% Feedback loops
    SCALE_OUT -.->|📊 Monitors impact| CPU_THRESHOLDS
    SCALE_UP -.->|📊 Monitors impact| MEMORY_THRESHOLDS
    SCALE_DOWN -.->|📊 Validates safety| TRAFFIC_SPIKE
    SCALE_IN -.->|📊 Validates safety| RESOURCE_PRESSURE
    
    %% Styling
    classDef resourceClass fill:#e3f2fd,stroke:#0d47a1,stroke-width:2px
    classDef scalingClass fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px
    classDef thresholdClass fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef triggerClass fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef actionClass fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    
    class LOAD_BALANCER,FRONTEND,BACKEND,DATABASE,REPLICA,REDIS_CACHE,MONITORING resourceClass
    class HPA_FRONTEND,HPA_BACKEND,VPA_POLICIES,CLUSTER_AUTO scalingClass
    class CPU_THRESHOLDS,MEMORY_THRESHOLDS,NETWORK_THRESHOLDS,DISK_THRESHOLDS thresholdClass
    class TRAFFIC_SPIKE,RESOURCE_PRESSURE,SCHEDULED_SCALE,COST_OPTIMIZATION triggerClass
    class SCALE_OUT,SCALE_UP,SCALE_DOWN,SCALE_IN actionClass
```

### Mô tả sử dụng:
- **Mục đích**: Hiển thị resource allocation và auto-scaling architecture
- **Thành phần**: Resource specs, scaling policies, thresholds, triggers, actions
- **Scaling**: Horizontal và vertical scaling strategies
- **Sử dụng**: Capacity planning, cost optimization, performance tuning

---

## 📋 Hướng dẫn sử dụng Mermaid Scripts

### Cách sử dụng các script:

1. **Copy script** từ các section trên
2. **Paste vào Mermaid editor**:
   - [Mermaid Live Editor](https://mermaid.live)
   - GitHub/GitLab (markdown files)
   - VS Code với Mermaid extension
   - Confluence, Notion, hay các tools khác hỗ trợ Mermaid

3. **Customize theo needs**:
   - Thay đổi colors trong `classDef` statements
   - Điều chỉnh labels và descriptions
   - Thêm/bớt components theo architecture requirements
   - Modify connections và data flows

### Customization Examples:

#### Thay đổi màu sắc:
```mermaid
classDef myCustomClass fill:#your-color,stroke:#border-color,stroke-width:2px
class NODE1,NODE2 myCustomClass
```

#### Thêm styling cho connections:
```mermaid
A -->|Label text| B
A -.->|Dotted line| C
A ==>|Thick line| D
```

#### Tạo subgraphs mới:
```mermaid
subgraph "Your Custom Group"
    COMPONENT[Your Component<br/>Description<br/>Specs]
end
```

### Best Practices:

1. **Consistent naming**: Sử dụng naming convention nhất quán
2. **Clear labels**: Labels ngắn gọn nhưng đầy đủ thông tin
3. **Logical grouping**: Group related components trong subgraphs
4. **Color coding**: Sử dụng colors để phân biệt các loại components
5. **Documentation**: Include mô tả và context cho mỗi diagram

### Integration với documentation:

- **Architecture docs**: Embed trong technical specifications
- **Presentations**: Export as images cho slides
- **Training materials**: Visual aids cho team onboarding
- **Compliance**: Document infrastructure cho audits
- **Planning**: Visualize proposed changes và improvements

---

**Total Scripts**: 8 comprehensive Mermaid diagrams covering all aspects của Deployment View architecture, từ overall infrastructure đến detailed scaling policies và disaster recovery procedures.
