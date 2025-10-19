#!/bin/bash
cd /home/kavia/workspace/code-generation/sp-performance-analysis-and-ranking-176402-176411/sp_ranking_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

