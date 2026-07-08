
<div align="center">

# 🚀 AI-Research-Hotspot-Monitor

**智能化、自动化的 AI 前沿研究热点追踪与文献分析流水线**

[![Python Version](https://img.shields.io/badge/python-3.9%2B-blue.svg)](https://www.python.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Data Pipeline](https://img.shields.io/badge/Data-Pipeline-orange.svg)]()

</div>

---

## 📌 项目简介

**AI-Research-Hotspot-Monitor** 是一个专为学术研究人员、数据工程师及 AI 从业者打造的端到端文献监控系统。面对每日海量涌现的 AI 预印本论文（如 arXiv）和顶会录用文章，纯人工筛选已变得不切实际。

本项目旨在构建一个高鲁棒性的复杂数据流水线（Complex Data Pipeline），通过自动化的网页抓取、API 交互与自然语言处理（NLP），从海量非结构化文献中提取核心观点、追踪研究趋势，并自动生成研究热点报告。无论是进行前沿 AI 技术的探索，还是为跨学科的实证研究寻找文献支持，本项目都能极大地提升调研效率。

## ✨ 核心功能

- 🕷️ **多源高并发文献采集：** 结合原生 API 与自动化测试工具（支持 **Selenium** 与 **Playwright**），无缝突破动态渲染与反爬虫限制，稳定抓取 arXiv、Google Scholar 等平台的论文元数据（标题、摘要、作者列表等）。
- ⚙️ **自动化 ETL 流水线：** 使用 **Pandas** 和 **SQL** 对非结构化文本进行清洗、去重与结构化存储，构建可供后续大规模实证分析的本地文献数据库。
- 🧠 **大模型驱动的深度摘要：** 接入主流 LLM API，对每日更新的论文摘要进行深度语义提取，提炼出核心贡献（Contributions）和创新方法论。
- 📊 **热点趋势追踪与可视化：** 基于时间序列分析，追踪特定前沿话题（如 *LLM, FinTech, RAG, Agent*）的关注度热度变化，自动生成高质量的可视化图表。
- 🔔 **定制化报告推送：** 自动聚合每日/每周的“高价值”研究成果，生成 Markdown 格式的热度报告，并可通过邮件或 Webhook 定时推送。

## 🛠️ 技术架构与依赖

本项目基于高度模块化的设计，底层依赖以下核心库：

- **数据采集与自动化：** `selenium`, `playwright`, `requests`, `arxiv`
- **数据处理与工程：** `pandas`, `numpy`, `sqlalchemy` (SQL 数据库交互)
- **文本分析与建模：** `openai` (或兼容的 LLM SDK), `scikit-learn`
- **可视化支持：** `matplotlib`, `plotly`

## 🚀 快速开始

### 1. 环境准备

建议使用 `conda` 或 `venv` 创建独立的虚拟环境：

```bash
# 克隆仓库
git clone [https://github.com/12138166/AI-Research-Hotspot-Monitor.git](https://github.com/12138166/AI-Research-Hotspot-Monitor.git)
cd AI-Research-Hotspot-Monitor

# 创建并激活虚拟环境
conda create -n ai-monitor python=3.10
conda activate ai-monitor

# 安装核心依赖
pip install -r requirements.txt

```

*(注意：若开启动态抓取模块，请确保已通过 `playwright install` 安装相应的浏览器内核配置。)*

### 2. 配置文件设置

在项目根目录复制一份环境变量模板：

```bash
cp config.example.yaml config.yaml

```

在 `config.yaml` 中配置您的数据库连接字符串、API Keys 以及监控关键词：

```yaml
# config.yaml 示例
database:
  uri: "sqlite:///data/papers.db" # 或配置您的 MySQL/PostgreSQL 链接

llm_api:
  provider: "openai"
  api_key: "sk-xxxxxx"

monitor_settings:
  sources: ["arxiv.cs.ai", "arxiv.cs.cl"]
  keywords: ["Large Language Models", "FinTech", "Blockchain", "Empirical Analysis"]
  update_frequency: "daily"

```

### 3. 运行流水线

项目支持按模块独立运行或通过主调度程序一键启动：

```bash
# 启动全量更新流水线（抓取 -> 清洗 -> 分析 -> 报告生成）
python main.py --mode full

# 仅运行数据抓取模块
python src/scraper.py --source arxiv

# 仅生成基于当前数据库的趋势分析报告
python src/analyzer.py --generate-report

```

生成的报告将默认保存在 `outputs/reports/` 目录下。

## 📂 项目结构

```text
AI-Research-Hotspot-Monitor/
│
├── data/                  # 原始数据与 SQLite 数据库存放目录
├── outputs/               # 生成的热点报告、可视化图表目录
├── src/                   # 核心源代码
│   ├── scraper.py         # 爬虫与 API 抓取模块 (Playwright/Selenium/Requests)
│   ├── pipeline.py        # ETL 处理逻辑 (Pandas 数据清洗)
│   ├── analyzer.py        # 文本分析与主题聚类模型
│   ├── reporter.py        # Markdown 报告生成模块
│   └── utils.py           # 数据库连接 (SQL) 与日志等工具函数
│
├── config.yaml            # 系统配置文件
├── main.py                # 主执行文件
├── requirements.txt       # Python 依赖清单
└── README.md              # 项目文档

```

## 🤝 贡献指南

我们欢迎所有旨在提升此监控系统鲁棒性和分析深度的贡献。无论您是想优化复杂的数据流逻辑，还是改进底层架构，都欢迎提交 Pull Request (PR)。

1. Fork 本仓库
2. 创建您的 Feature 分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的修改 (`git commit -m 'Add some AmazingFeature'`)
4. 将您的分支推送到远端 (`git push origin feature/AmazingFeature`)
5. 开启一个 Pull Request

## 📄 许可证

本项目采用 [MIT License](https://www.google.com/search?q=LICENSE) 许可证。您可以自由地将其应用于各类学术研究、代码构建与数据工程项目中。

