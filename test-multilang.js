#!/usr/bin/env node
/**
 * 다중 언어 코드 분석 테스트
 */

import { promises as fs } from 'fs';
import path from 'path';

const TEST_DIR = './multilang-test';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

// 테스트용 샘플 코드들
const sampleCodes = {
  'test.js': `
// JavaScript test file
import { readFile } from 'fs';
import axios from 'axios';

export class UserService {
  constructor(db) {
    this.db = db;
  }
  
  async getUser(id) {
    return await this.db.find(id);
  }
  
  deleteUser(id) {
    return this.db.delete(id);
  }
}

export async function processData(data) {
  return data.map(item => item * 2);
}

const API_KEY = 'secret123';
let counter = 0;
`,

  'test.py': `
# Python test file
import os
from datetime import datetime
import pandas as pd

API_KEY = "secret123"
DEBUG_MODE = True

class DataProcessor:
    def __init__(self, config):
        self.config = config
        self.data = []
    
    async def process_async(self, items):
        """Process items asynchronously"""
        return [self._transform(item) for item in items]
    
    def _transform(self, item):
        return item * 2

def calculate_average(numbers):
    """Calculate the average of a list of numbers"""
    return sum(numbers) / len(numbers)

async def fetch_data(url):
    # Fetch data from URL
    pass
`,

  'test.java': `
// Java test file
package com.example.test;

import java.util.List;
import java.util.ArrayList;
import javax.persistence.Entity;

@Entity
public class UserService {
    private DatabaseConnection db;
    
    public UserService(DatabaseConnection db) {
        this.db = db;
    }
    
    public User getUser(Long id) throws UserNotFoundException {
        return db.findById(id);
    }
    
    public void deleteUser(Long id) {
        db.delete(id);
    }
    
    private void validateUser(User user) {
        // Validation logic
    }
}

public class MathUtils {
    public static double calculateAverage(List<Double> numbers) {
        return numbers.stream()
            .mapToDouble(Double::doubleValue)
            .average()
            .orElse(0.0);
    }
}
`,

  'test.go': `
// Go test file
package main

import (
    "fmt"
    "net/http"
    "encoding/json"
)

type User struct {
    ID   int64  \`json:"id"\`
    Name string \`json:"name"\`
}

type UserService struct {
    db Database
}

func NewUserService(db Database) *UserService {
    return &UserService{db: db}
}

func (s *UserService) GetUser(id int64) (*User, error) {
    return s.db.FindByID(id)
}

func (s *UserService) DeleteUser(id int64) error {
    return s.db.Delete(id)
}

func CalculateAverage(numbers []float64) float64 {
    sum := 0.0
    for _, num := range numbers {
        sum += num
    }
    return sum / float64(len(numbers))
}
`,

  'test.rs': `
// Rust test file
use std::collections::HashMap;
use serde::{Serialize, Deserialize};
use tokio::fs;

#[derive(Debug, Serialize, Deserialize)]
pub struct User {
    id: i64,
    name: String,
}

pub struct UserService {
    db: Box<dyn Database>,
}

impl UserService {
    pub fn new(db: Box<dyn Database>) -> Self {
        UserService { db }
    }
    
    pub async fn get_user(&self, id: i64) -> Result<User, Error> {
        self.db.find_by_id(id).await
    }
    
    pub fn delete_user(&mut self, id: i64) -> Result<(), Error> {
        self.db.delete(id)
    }
    
    fn validate_user(&self, user: &User) -> bool {
        !user.name.is_empty()
    }
}

pub fn calculate_average(numbers: &[f64]) -> f64 {
    let sum: f64 = numbers.iter().sum();
    sum / numbers.len() as f64
}
`,

  'test.php': `
<?php
// PHP test file
namespace App\\Services;

use App\\Models\\User;
use Illuminate\\Support\\Facades\\DB;

class UserService {
    private $db;
    
    public function __construct($db) {
        $this->db = $db;
    }
    
    public function getUser($id) {
        return $this->db->find($id);
    }
    
    public function deleteUser($id) {
        return $this->db->delete($id);
    }
    
    private function validateUser($user) {
        return !empty($user->name);
    }
}

function calculateAverage($numbers) {
    return array_sum($numbers) / count($numbers);
}
`,

  'test.rb': `
# Ruby test file
require 'json'
require 'net/http'
require_relative 'database'

class UserService
  def initialize(db)
    @db = db
  end
  
  def get_user(id)
    @db.find(id)
  end
  
  def delete_user(id)
    @db.delete(id)
  end
  
  private
  
  def validate_user(user)
    !user.name.empty?
  end
end

def calculate_average(numbers)
  numbers.sum.to_f / numbers.length
end

module MathHelpers
  def self.square(n)
    n * n
  end
end
`
};

async function setup() {
  await fs.mkdir(TEST_DIR, { recursive: true });
  
  // 각 언어별 샘플 파일 생성
  for (const [filename, content] of Object.entries(sampleCodes)) {
    await fs.writeFile(path.join(TEST_DIR, filename), content);
  }
}

async function testAnalyzeCode() {
  const { createCommandRegistry } = await import('./dist/core/commands/index.js');
  const { FileSystemManager } = await import('./dist/core/FileSystemManager.js');
  
  const registry = createCommandRegistry();
  const fsManager = new FileSystemManager();
  
  console.log(`${colors.blue}╔═══════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.blue}║      Multi-Language Code Analysis Test            ║${colors.reset}`);
  console.log(`${colors.blue}╚═══════════════════════════════════════════════════╝${colors.reset}\n`);
  
  const languages = [
    { file: 'test.js', name: 'JavaScript' },
    { file: 'test.py', name: 'Python' },
    { file: 'test.java', name: 'Java' },
    { file: 'test.go', name: 'Go' },
    { file: 'test.rs', name: 'Rust' },
    { file: 'test.php', name: 'PHP' },
    { file: 'test.rb', name: 'Ruby' }
  ];
  
  let successCount = 0;
  
  for (const lang of languages) {
    const filePath = path.join(TEST_DIR, lang.file);
    console.log(`\n${colors.yellow}Testing ${lang.name}:${colors.reset}`);
    console.log('─'.repeat(50));
    
    try {
      const result = await registry.execute('analyze_code', {
        args: { path: filePath },
        fsManager
      });
      
      const output = result.content[0].text;
      
      // 결과 파싱
      const imports = (output.match(/Imports:\n((?:  - .+\n)*)/)?.[1] || '').split('\n').filter(l => l.trim()).length;
      const functions = (output.match(/Functions:\n((?:  - .+\n)*)/)?.[1] || '').split('\n').filter(l => l.trim()).length;
      const classes = (output.match(/Classes:\n((?:  - .+\n)*)/)?.[1] || '').split('\n').filter(l => l.trim()).length;
      
      console.log(`${colors.green}✅ Analysis successful${colors.reset}`);
      console.log(`   Imports: ${imports}`);
      console.log(`   Functions: ${functions}`);
      console.log(`   Classes: ${classes}`);
      
      successCount++;
    } catch (error) {
      console.log(`${colors.red}❌ Analysis failed: ${error.message}${colors.reset}`);
    }
  }
  
  console.log(`\n${colors.blue}═══════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}Summary:${colors.reset}`);
  console.log(`   Success: ${successCount}/${languages.length} languages`);
  console.log(`   Success Rate: ${((successCount / languages.length) * 100).toFixed(1)}%`);
  
  if (successCount === languages.length) {
    console.log(`\n${colors.green}✨ Perfect! All languages are supported${colors.reset}`);
  } else if (successCount >= 5) {
    console.log(`\n${colors.green}👍 Good! Most languages are supported${colors.reset}`);
  } else {
    console.log(`\n${colors.yellow}⚠️  Limited language support${colors.reset}`);
  }
}

async function cleanup() {
  try {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
  } catch {}
}

async function main() {
  try {
    await setup();
    await testAnalyzeCode();
    await cleanup();
    
    console.log(`\n${colors.green}✅ Multi-language test complete!${colors.reset}`);
  } catch (error) {
    console.error(`\n${colors.red}Fatal error:${colors.reset}`, error);
    await cleanup();
    process.exit(1);
  }
}

main();
