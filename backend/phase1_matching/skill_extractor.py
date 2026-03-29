# skill_extractor.py
import re

# ─────────────────────────────────────────────
# LAYER 1 — ALIAS NORMALIZATION
# Maps common variations to one canonical name
# "ReactJS" → "React", "Postgres" → "PostgreSQL"
# ─────────────────────────────────────────────

SKILL_ALIASES = {
    # JavaScript ecosystem
    "ReactJS"          : "React",
    "React.js"         : "React",
    "VueJS"            : "Vue",
    "Vue.js"           : "Vue",
    "AngularJS"        : "Angular",
    "NextJS"           : "Next.js",
    "Next JS"          : "Next.js",
    "NodeJS"           : "Node.js",
    "Node JS"          : "Node.js",
    "Node"             : "Node.js",
    "ExpressJS"        : "Express",
    "Express.js"       : "Express",
    "JS"               : "JavaScript",
    "TS"               : "TypeScript",

    # Python ecosystem
    "sklearn"          : "Scikit-learn",
    "scikit"           : "Scikit-learn",
    "SK-learn"         : "Scikit-learn",
    "sci-kit"          : "Scikit-learn",
    "TF"               : "TensorFlow",
    "tf"               : "TensorFlow",
    "FastAPI framework": "FastAPI",

    # Databases
    "Postgres"         : "PostgreSQL",
    "Mongo"            : "MongoDB",
    "MS SQL"           : "SQL Server",
    "MSSQL"            : "SQL Server",
    "MySQL DB"         : "MySQL",
    "ElasticSearch"    : "Elasticsearch",
    "DynamoDB"         : "DynamoDB",

    # DevOps / Cloud
    "K8s"              : "Kubernetes",
    "k8s"              : "Kubernetes",
    "GH Actions"       : "GitHub Actions",
    "Github actions"   : "GitHub Actions",
    "CI CD"            : "CI/CD",
    "ci/cd"            : "CI/CD",
    "Amazon Web Services": "AWS",
    "Google Cloud"     : "GCP",
    "Google Cloud Platform": "GCP",
    "Microsoft Azure"  : "Azure",

    # Backend frameworks
    "SpringBoot"       : "Spring Boot",
    "Spring-Boot"      : "Spring Boot",
    "NestJS"           : "NestJS",
    "Nest.js"          : "NestJS",
    "DjangoREST"       : "Django REST",
    "DRF"              : "Django REST",

    # AI / ML
    "ML"               : "Machine Learning",
    "DL"               : "Deep Learning",
    "LLMs"             : "LLM",
    "Gen AI"           : "Generative AI",
    "GenAI"            : "Generative AI",
    "HuggingFace"      : "Hugging Face",
    "Open CV"          : "OpenCV",
    "Langchain"        : "LangChain",

    # Testing
    "Selenium WebDriver": "Selenium",
    "API Testing"      : "API Testing",
    "automation testing": "Automation Testing",

    # Tools
    "Git Hub"          : "GitHub",
    "Power-BI"         : "Power BI",
    "PowerBI"          : "Power BI",
    "Tableau Desktop"  : "Tableau",
    "Rabbit MQ"        : "RabbitMQ",
    "Apache Kafka"     : "Kafka",
    "Apache Spark"     : "Spark"
}


def normalize_skills(text):
    """
    Replaces all known aliases with their canonical skill name.
    Runs before keyword matching so variations don't get missed.

    Example:
        "Experience with ReactJS and Postgres" 
        → "Experience with React and PostgreSQL"
    """
    for alias, canonical in SKILL_ALIASES.items():
        text = re.sub(
            r'\b' + re.escape(alias) + r'\b',
            canonical,
            text,
            flags=re.IGNORECASE
        )
    return text


# ─────────────────────────────────────────────
# LAYER 2 — EXPANDED SKILL LIST
# Organized by category for easy maintenance
# Add new skills here as needed
# ─────────────────────────────────────────────

KNOWN_SKILLS = {
    "languages": [
        "Python", "Java", "JavaScript", "TypeScript", "C++", "C#",
        "C", "Go", "Rust", "Kotlin", "Swift", "R", "Scala",
        "PHP", "Ruby", "Dart", "Bash", "Shell", "MATLAB"
    ],

    "frontend": [
        "React", "Angular", "Vue", "Next.js", "Svelte",
        "HTML", "CSS", "Tailwind", "Bootstrap", "Redux",
        "Webpack", "Vite", "jQuery", "SASS", "SCSS"
    ],

    "backend": [
        "Node.js", "Express", "Flask", "FastAPI", "Django",
        "Spring Boot", "NestJS", "Laravel", "Ruby on Rails",
        "GraphQL", "REST API", "gRPC", "Microservices"
    ],

    "databases": [
        "PostgreSQL", "MySQL", "MongoDB", "Redis", "SQLite",
        "SQL Server", "Oracle", "DynamoDB", "Cassandra",
        "Elasticsearch", "Firebase", "Supabase", "MariaDB"
    ],

    "devops_cloud": [
        "Docker", "Kubernetes", "Terraform", "Ansible",
        "Jenkins", "GitHub Actions", "CI/CD", "Git", "GitHub",
        "GitLab", "AWS", "Azure", "GCP", "Linux", "Nginx",
        "Apache", "Prometheus", "Grafana", "Helm"
    ],

    "ai_ml": [
        "Machine Learning", "Deep Learning", "NLP", "TensorFlow",
        "PyTorch", "Scikit-learn", "Pandas", "NumPy", "OpenCV",
        "LangChain", "Hugging Face", "LLM", "Generative AI",
        "Computer Vision", "Reinforcement Learning", "MLOps",
        "Keras", "XGBoost", "BERT", "Transformers", "Boto3"
    ],

    "testing": [
        "Selenium", "JUnit", "TestNG", "Pytest", "Postman",
        "Jest", "Cypress", "Mocha", "Chai", "API Testing",
        "Automation Testing", "Load Testing", "JMeter"
    ],

    "data": [
        "SQL", "Spark", "Hadoop", "Kafka", "Airflow",
        "Tableau", "Power BI", "Excel", "ETL", "Data Pipelines",
        "Databricks", "Snowflake", "dbt", "Pandas", "NumPy"
    ],

    "security": [
        "Prisma Cloud", "Cybersecurity", "Penetration Testing",
        "OWASP", "OAuth", "JWT", "SSL", "Cryptography",
        "IAM", "Zero Trust", "SIEM", "Vulnerability Assessment"
    ],

    "tools_practices": [
        "Jira", "Figma", "Confluence", "Notion", "Slack",
        "RabbitMQ", "Agile", "Scrum", "Kanban", "TDD",
        "System Design", "OOP", "Design Patterns",
        "Data Structures", "Algorithms", "Blockchain",
        "Smart Contracts", "Solidity", "Web3"
    ]
}

# Flatten into a single list for matching
ALL_SKILLS = [skill for category in KNOWN_SKILLS.values() for skill in category]


def extract_skills(raw_text):
    """
    Full two-layer extraction pipeline.

    Layer 1 → normalize_skills() converts aliases to canonical names
    Layer 2 → scan normalized text against ALL_SKILLS list

    Returns deduplicated list of matched skills preserving original casing.

    Example:
        Input  → "Built APIs using ReactJS, Postgres and deployed via K8s"
        After Layer 1 → "Built APIs using React, PostgreSQL and deployed via Kubernetes"
        After Layer 2 → ["React", "PostgreSQL", "Kubernetes"]
    """
    normalized = normalize_skills(raw_text)

    matched = [
        skill for skill in ALL_SKILLS
        if re.search(r'\b' + re.escape(skill) + r'\b', normalized, re.IGNORECASE)
    ]

    # Deduplicate while preserving order
    seen = set()
    unique = []
    for skill in matched:
        if skill.lower() not in seen:
            seen.add(skill.lower())
            unique.append(skill)

    return unique
