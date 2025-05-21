#!/bin/bash
git rm -r --cached .
git add .
git commit -m "Reset Git cache and apply .gitignore rules"
