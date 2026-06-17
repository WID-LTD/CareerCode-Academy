import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

const OUT_DIR = path.join(process.cwd(), 'generated-videos');
const TMP_DIR = path.join(OUT_DIR, '_tmp');
const FONT_DST = path.join(TMP_DIR, 'font.ttf');

function ensureDirectories() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    console.log(`Created output directory: ${OUT_DIR}`);
  }
  if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, { recursive: true });
    console.log(`Created temp directory: ${TMP_DIR}`);
  }
  if (!fs.existsSync(FONT_DST)) {
    try {
      fs.copyFileSync('C:/Windows/Fonts/arial.ttf', FONT_DST);
      console.log('Font copied to temp directory');
    } catch (err) {
      console.error('Failed to copy font:', err);
    }
  }
}

interface Scene {
  title: string;
  subtitle: string;
  bullets: string[];
  duration: number;
  isTitleSlide?: boolean;
}

interface ModuleVideo {
  filename: string;
  courseName: string;
  moduleNumber: number;
  moduleTitle: string;
  scenes: Scene[];
}

const MODULES: ModuleVideo[] = [
  // === JAVASCRIPT ALGORITHMS & DATA STRUCTURES ===
  {
    filename: 'CareerCode_JS_Module_1_JavaScript_Fundamentals.mp4',
    courseName: 'JavaScript Algorithms & Data Structures',
    moduleNumber: 1,
    moduleTitle: 'JavaScript Fundamentals',
    scenes: [
      {
        title: 'Module 1',
        subtitle: 'JavaScript Fundamentals',
        bullets: [
          'Master variables, constants, and fundamental data types',
          'Implement conditional logic and loop structures',
          'Create reusable blocks of logic using functions',
          'Explore scope rules and multi-dimensional array operations'
        ],
        duration: 8
      },
      {
        title: 'Learning Objectives',
        subtitle: 'Expected Core Competencies',
        bullets: [
          'Understand variables, variable scope, and fundamental types',
          'Construct complex conditional statements and repetitive loops',
          'Design and execute functions with inputs and return values',
          'Manipulate simple and nested arrays effectively'
        ],
        duration: 8
      }
    ]
  },
  {
    filename: 'CareerCode_JS_Module_2_ES6_and_Modern_JavaScript.mp4',
    courseName: 'JavaScript Algorithms & Data Structures',
    moduleNumber: 2,
    moduleTitle: 'ES6 and Modern JavaScript',
    scenes: [
      {
        title: 'Module 2',
        subtitle: 'ES6 & Modern JavaScript',
        bullets: [
          'Write concise code with arrow functions and destructuring',
          'Manipulate sets of values using the spread and rest operators',
          'Organize code blocks into modular import/export files',
          'Handle asynchronous code with promises and async/await blocks'
        ],
        duration: 8
      },
      {
        title: 'Learning Objectives',
        subtitle: 'Expected Core Competencies',
        bullets: [
          'Convert traditional functions into streamlined arrow functions',
          'Extract object and array properties using modern ES6 syntax',
          'Implement modular code architecture across files',
          'Manage complex API calls and asynchronous operations cleanly'
        ],
        duration: 8
      }
    ]
  },
  {
    filename: 'CareerCode_JS_Module_3_Debugging_and_Problem_Solving.mp4',
    courseName: 'JavaScript Algorithms & Data Structures',
    moduleNumber: 3,
    moduleTitle: 'Debugging & Problem Solving',
    scenes: [
      {
        title: 'Module 3',
        subtitle: 'Debugging & Problem Solving',
        bullets: [
          'Utilize console tools to isolate and fix runtime issues',
          'Protect applications from crashing using try/catch blocks',
          'Apply algorithmic thinking to solve logical requirements',
          'Optimize code performance and remove redundant operations'
        ],
        duration: 8
      },
      {
        title: 'Learning Objectives',
        subtitle: 'Expected Core Competencies',
        bullets: [
          'Debug applications methodically using inspector consoles',
          'Predict, catch, and handle application errors gracefully',
          'Formulate logical, step-by-step algorithms for problems',
          'Analyze and refine time complexity for optimal run speed'
        ],
        duration: 8
      }
    ]
  },
  {
    filename: 'CareerCode_JS_Module_4_Object_Oriented_Programming.mp4',
    courseName: 'JavaScript Algorithms & Data Structures',
    moduleNumber: 4,
    moduleTitle: 'Object-Oriented Programming',
    scenes: [
      {
        title: 'Module 4',
        subtitle: 'Object-Oriented Programming',
        bullets: [
          'Model real-world entities using JavaScript objects',
          'Construct objects dynamically using ES6 class syntax',
          'Replicate behavior across entities using class inheritance',
          'Master JavaScript prototypes and encapsulate properties'
        ],
        duration: 8
      },
      {
        title: 'Learning Objectives',
        subtitle: 'Expected Core Competencies',
        bullets: [
          'Understand key OOP principles: inheritance and encapsulation',
          'Write blueprints for structures using classes and constructors',
          'Extend class models to reuse attributes and methods',
          'Navigate prototypes to optimize properties inheritance'
        ],
        duration: 8
      }
    ]
  },
  {
    filename: 'CareerCode_JS_Module_5_Data_Structures.mp4',
    courseName: 'JavaScript Algorithms & Data Structures',
    moduleNumber: 5,
    moduleTitle: 'Data Structures',
    scenes: [
      {
        title: 'Module 5',
        subtitle: 'Data Structures',
        bullets: [
          'Organize custom datasets with stacks and queues',
          'Implement dynamic memory arrays using linked lists',
          'Navigate structured hierarchies with trees and graphs',
          'Perform instant data queries using hash tables'
        ],
        duration: 8
      },
      {
        title: 'Learning Objectives',
        subtitle: 'Expected Core Competencies',
        bullets: [
          'Understand the structural trade-offs of stacks versus queues',
          'Create and manipulate node-based linked list segments',
          'Traverse trees and search connections in graphs',
          'Build hash functions to avoid memory index collisions'
        ],
        duration: 8
      }
    ]
  },
  {
    filename: 'CareerCode_JS_Module_6_Algorithms.mp4',
    courseName: 'JavaScript Algorithms & Data Structures',
    moduleNumber: 6,
    moduleTitle: 'Algorithms',
    scenes: [
      {
        title: 'Module 6',
        subtitle: 'Algorithms',
        bullets: [
          'Compare searching algorithms: linear and binary search',
          'Analyze sorting algorithms: bubble, merge, and quicksort',
          'Create elegant recursive processes to break down problems',
          'Master dynamic programming, greedy algorithms, and graph paths'
        ],
        duration: 8
      },
      {
        title: 'Learning Objectives',
        subtitle: 'Expected Core Competencies',
        bullets: [
          'Select the optimal sorting model based on data dimensions',
          'Design termination baselines for recursive call stacks',
          'Cache subproblem outputs to optimize dynamic algorithms',
          'Implement depth-first and breadth-first search traversals'
        ],
        duration: 8
      }
    ]
  },
  {
    filename: 'CareerCode_JS_Module_7_Interview_Preparation.mp4',
    courseName: 'JavaScript Algorithms & Data Structures',
    moduleNumber: 7,
    moduleTitle: 'Interview Preparation',
    scenes: [
      {
        title: 'Module 7',
        subtitle: 'Interview Preparation',
        bullets: [
          'Deconstruct standard whiteboard algorithms in real time',
          'Optimize execution paths to achieve best Big O runtimes',
          'Master core interview communication and design steps',
          'Practice with common tests: Palindrome & Roman Numeral'
        ],
        duration: 8
      },
      {
        title: 'Learning Objectives',
        subtitle: 'Expected Core Competencies',
        bullets: [
          'Explain computational thoughts out loud while live coding',
          'Refactor high-latency algorithms into linear/logarithmic time',
          'Debug complex algorithmic edge cases under timing pressure',
          'Build strong candidate portfolios for tech interviews'
        ],
        duration: 8
      }
    ]
  },

  // === RESPONSIVE WEB DESIGN ===
  {
    filename: 'CareerCode_RWD_Module_1_Introduction_to_the_Web.mp4',
    courseName: 'Responsive Web Design (Beginner)',
    moduleNumber: 1,
    moduleTitle: 'Introduction to the Web',
    scenes: [
      {
        title: 'Module 1',
        subtitle: 'Introduction to the Web',
        bullets: [
          'Understand how domain name resolution and hosting work',
          'Explore browser rendering engines and HTTP protocols',
          'Deconstruct client-server architectures and response codes',
          'Configure professional development editors and dev tools'
        ],
        duration: 8
      },
      {
        title: 'Learning Objectives',
        subtitle: 'Expected Core Competencies',
        bullets: [
          'Explain website request-response communication loops',
          'Identify and use key developer components in browsers',
          'Understand host systems and deployment server nodes',
          'Write, inspect, and test basic workspace files'
        ],
        duration: 8
      }
    ]
  },
  {
    filename: 'CareerCode_RWD_Module_2_HTML_Fundamentals.mp4',
    courseName: 'Responsive Web Design (Beginner)',
    moduleNumber: 2,
    moduleTitle: 'HTML Fundamentals',
    scenes: [
      {
        title: 'Module 2',
        subtitle: 'HTML Fundamentals',
        bullets: [
          'Build basic document trees using tag structures',
          'Write accessible text sections, links, and asset anchors',
          'Collect user inputs through modern, accessible form structures',
          'Incorporate semantic HTML tags to assist screen readers'
        ],
        duration: 8
      },
      {
        title: 'Learning Objectives',
        subtitle: 'Expected Core Competencies',
        bullets: [
          'Structure content hierarchies using h1-h6 tags logically',
          'Create lists, structural tables, and media links',
          'Construct validated forms with inputs, labels, and buttons',
          'Apply accessibility guidelines (WCAG) to tags'
        ],
        duration: 8
      }
    ]
  },
  {
    filename: 'CareerCode_RWD_Module_3_CSS_Fundamentals.mp4',
    courseName: 'Responsive Web Design (Beginner)',
    moduleNumber: 3,
    moduleTitle: 'CSS Fundamentals',
    scenes: [
      {
        title: 'Module 3',
        subtitle: 'CSS Fundamentals',
        bullets: [
          'Target elements with class, id, and attribute selectors',
          'Customize fonts, colors, line heights, and typography',
          'Calculate box model variables: padding, borders, margins',
          'Position content elements: absolute, fixed, and sticky'
        ],
        duration: 8
      },
      {
        title: 'Learning Objectives',
        subtitle: 'Expected Core Competencies',
        bullets: [
          'Style target classes and ids selectively without conflicts',
          'Implement harmonious typographic hierarchies and palettes',
          'Control block spacing, overflow rules, and border limits',
          'Overlay navbar layers and sidebars using z-index rules'
        ],
        duration: 8
      }
    ]
  },
  {
    filename: 'CareerCode_RWD_Module_4_Layout_Systems.mp4',
    courseName: 'Responsive Web Design (Beginner)',
    moduleNumber: 4,
    moduleTitle: 'Layout Systems',
    scenes: [
      {
        title: 'Module 4',
        subtitle: 'Layout Systems',
        bullets: [
          'Align navbars and flex lines using CSS Flexbox rules',
          'Build complex two-dimensional page layers with CSS Grid',
          'Create auto-wrapping grids that adapt to grid cell sizes',
          'Combine Flexbox and Grid to construct balanced layouts'
        ],
        duration: 8
      },
      {
        title: 'Learning Objectives',
        subtitle: 'Expected Core Competencies',
        bullets: [
          'Control flex direction, wrapping, and alignment values',
          'Define grid template rows, columns, and spacing gaps',
          'Position child items dynamically within grid columns',
          'Design multi-column templates without template tables'
        ],
        duration: 8
      }
    ]
  },
  {
    filename: 'CareerCode_RWD_Module_5_Responsive_Design.mp4',
    courseName: 'Responsive Web Design (Beginner)',
    moduleNumber: 5,
    moduleTitle: 'Responsive Design',
    scenes: [
      {
        title: 'Module 5',
        subtitle: 'Responsive Design',
        bullets: [
          'Code fluid media queries using mobile-first viewports',
          'Create responsive images and media that match columns',
          'Incorporate viewport scaling configurations in HTML',
          'Build adaptive menus that toggle on smaller displays'
        ],
        duration: 8
      },
      {
        title: 'Learning Objectives',
        subtitle: 'Expected Core Competencies',
        bullets: [
          'Define clean media query boundaries for screen classes',
          'Style fluid images that scale within column constraints',
          'Ensure layouts adapt to mobile, tablet, and desktop ratios',
          'Design navigation panels that collapse into hamburger menus'
        ],
        duration: 8
      }
    ]
  },
  {
    filename: 'CareerCode_RWD_Module_6_Projects.mp4',
    courseName: 'Responsive Web Design (Beginner)',
    moduleNumber: 6,
    moduleTitle: 'Projects',
    scenes: [
      {
        title: 'Module 6',
        subtitle: 'Projects',
        bullets: [
          'Construct a detailed feedback Form using validation rules',
          'Develop an styled Tribute Page celebrating historical figures',
          'Incorporate developer documentation layout systems',
          'Style custom landing pages and personal resume portfolios'
        ],
        duration: 8
      },
      {
        title: 'Learning Objectives',
        subtitle: 'Expected Core Competencies',
        bullets: [
          'Combine forms and semantic layouts in a single layout',
          'Maintain visual styling standards across distinct screens',
          'Style sidebar documentation with scrolling sections',
          'Host and compile clean source code repos on GitHub'
        ],
        duration: 8
      }
    ]
  },
  {
    filename: 'CareerCode_RWD_Module_7_Capstone_Project.mp4',
    courseName: 'Responsive Web Design (Beginner)',
    moduleNumber: 7,
    moduleTitle: 'Capstone Project',
    scenes: [
      {
        title: 'Module 7',
        subtitle: 'Capstone Project',
        bullets: [
          'Synthesize all CSS Grid, Flexbox, and HTML5 concepts',
          'Build a complete front-end website from scratch',
          'Test cross-browser support and inspect rendering paths',
          'Complete practical evaluations and publish your site'
        ],
        duration: 8
      },
      {
        title: 'Learning Objectives',
        subtitle: 'Expected Core Competencies',
        bullets: [
          'Manage multi-page navigation architectures cleanly',
          'Resolve mobile design challenges on target platforms',
          'Verify accessibility standards using audit packages',
          'Earn your career certificate with a published portfolio'
        ],
        duration: 8
      }
    ]
  }
];

function generateSceneVideo(scene: Scene, sceneIndex: number, moduleIndex: number, isTitleSlide: boolean, courseName: string, moduleNum: number, moduleTitle: string): Promise<string> {
  const bg = '0d1527'; // Dark navy Slate
  const dur = scene.duration;
  const FONT_REL = 'generated-videos/_tmp/font.ttf';
  const sceneOutPath = path.join(TMP_DIR, `mod_${moduleIndex}_scene_${sceneIndex}.mp4`);

  // Write scene titles and subtitles to files for drawtext to read safely
  const titleFile = path.join(TMP_DIR, `m_${moduleIndex}_s_${sceneIndex}_title.txt`);
  const subtitleFile = path.join(TMP_DIR, `m_${moduleIndex}_s_${sceneIndex}_subtitle.txt`);
  fs.writeFileSync(titleFile, scene.title, 'utf8');
  fs.writeFileSync(subtitleFile, scene.subtitle, 'utf8');

  const relTitleFile = `generated-videos/_tmp/m_${moduleIndex}_s_${sceneIndex}_title.txt`;
  const relSubtitleFile = `generated-videos/_tmp/m_${moduleIndex}_s_${sceneIndex}_subtitle.txt`;

  // Draw background and colored top/bottom borders
  let filter = `color=c=0x${bg}:s=1280x720:d=${dur}[bg];` +
    `color=c=0x3b82f6:s=1280x6:d=${dur}[hb];` +
    `[bg][hb]overlay=0:0[base];` +
    `color=c=0x3b82f6:s=1280x6:d=${dur}[fb];` +
    `[base][fb]overlay=0:714[base2];`;

  if (isTitleSlide) {
    // Write course name to file
    const courseFile = path.join(TMP_DIR, `m_${moduleIndex}_course.txt`);
    fs.writeFileSync(courseFile, courseName, 'utf8');
    const relCourseFile = `generated-videos/_tmp/m_${moduleIndex}_course.txt`;

    // Title slide layout: Course name (small, top), Module Number (huge, middle), Module Title (large, below)
    filter += `[base2]drawtext=textfile='${relCourseFile}':fontfile='${FONT_REL}':fontsize=22:fontcolor=0x94a3b8:x=(w-text_w)/2:y=180:alpha='min(1\\,t)'[t0];`;
    filter += `[t0]drawtext=textfile='${relTitleFile}':fontfile='${FONT_REL}':fontsize=64:fontcolor=0x3b82f6:x=(w-text_w)/2:y=240:alpha='min(1\\,max(0\\,t-0.5))'[t1];`;
    filter += `[t1]drawtext=textfile='${relSubtitleFile}':fontfile='${FONT_REL}':fontsize=36:fontcolor=0xFFFFFF:x=(w-text_w)/2:y=340:alpha='min(1\\,max(0\\,t-1.0))'[t2];`;
    prevLabel = 't2';
  } else {
    // Content slide layout: Title, Subtitle, Divider, and animated bullets
    filter += `[base2]drawtext=textfile='${relTitleFile}':fontfile='${FONT_REL}':fontsize=38:fontcolor=0xFFFFFF:x=(w-text_w)/2:y=100:alpha='min(1\\,t)'[t0];`;
    filter += `[t0]drawtext=textfile='${relSubtitleFile}':fontfile='${FONT_REL}':fontsize=22:fontcolor=0x3b82f6:x=(w-text_w)/2:y=160:alpha='min(1\\,max(0\\,t-0.5))'[t1];`;
    filter += `color=c=0x1e293b:s=400x2:d=${dur}[div];[t1][div]overlay=x=(W-400)/2:y=205[t2];`;

    let subPrev = 't2';
    scene.bullets.forEach((bullet, idx) => {
      const yPos = 250 + idx * 80;
      const bulletFile = path.join(TMP_DIR, `m_${moduleIndex}_s_${sceneIndex}_bullet_${idx}.txt`);
      fs.writeFileSync(bulletFile, `•  ${bullet}`, 'utf8');
      const relBulletFile = `generated-videos/_tmp/m_${moduleIndex}_s_${sceneIndex}_bullet_${idx}.txt`;
      const nextLabel = `b${idx}`;
      const delay = 1.2 + idx * 0.8;

      filter += `[${subPrev}]drawtext=textfile='${relBulletFile}':fontfile='${FONT_REL}':fontsize=20:fontcolor=0xe2e8f0:x=160:y=${yPos}:alpha='min(1\\,max(0\\,t-${delay}))'[${nextLabel}];`;
      subPrev = nextLabel;
    });
    prevLabel = subPrev;
  }

  // Draw logo / brand name at bottom right
  const brandFile = path.join(TMP_DIR, `m_${moduleIndex}_s_${sceneIndex}_brand.txt`);
  fs.writeFileSync(brandFile, `CareerCode Academy  |  M${moduleNum}`, 'utf8');
  const relBrandFile = `generated-videos/_tmp/m_${moduleIndex}_s_${sceneIndex}_brand.txt`;
  var prevLabel;
  filter += `[${prevLabel}]drawtext=textfile='${relBrandFile}':fontfile='${FONT_REL}':fontsize=13:fontcolor=0x475569:x=W-text_w-40:y=680[out]`;

  const filterPath = path.join(TMP_DIR, `m_${moduleIndex}_s_${sceneIndex}_filter.txt`);
  fs.writeFileSync(filterPath, filter, 'utf8');

  return new Promise((resolve, reject) => {
    const batContent = `@echo off
ffmpeg -y -f lavfi -i "color=c=0x${bg}:s=1280x720:d=${dur}" -filter_complex_script "${filterPath}" -map [out] -c:v libx264 -preset fast -crf 24 -pix_fmt yuv420p -movflags +faststart "${sceneOutPath}"
`;
    const batPath = path.join(TMP_DIR, `m_${moduleIndex}_s_${sceneIndex}_render.bat`);
    fs.writeFileSync(batPath, batContent, 'utf8');

    exec(`"${batPath}"`, { cwd: process.cwd() }, (err: any, _stdout: string, stderr: string) => {
      if (err) reject(new Error(stderr || err.message));
      else resolve(sceneOutPath);
    });
  });
}

async function renderModuleVideo(mod: ModuleVideo, moduleIndex: number): Promise<void> {
  console.log(`\n--------------------------------------------------`);
  console.log(`Generating Video: ${mod.filename}`);
  console.log(`Course: ${mod.courseName} (M${mod.moduleNumber})`);
  console.log(`--------------------------------------------------`);

  const sceneFiles: string[] = [];

  // 1. Render Title Slide (isTitleSlide = true)
  console.log(`  Scene 1/3 (Title Slide) in progress...`);
  const titleScene: Scene = {
    title: `Module ${mod.moduleNumber}`,
    subtitle: mod.moduleTitle,
    bullets: [],
    duration: 4
  };
  const titleFile = await generateSceneVideo(titleScene, 0, moduleIndex, true, mod.courseName, mod.moduleNumber, mod.moduleTitle);
  sceneFiles.push(titleFile);

  // 2. Render Topics Slide (isTitleSlide = false)
  console.log(`  Scene 2/3 (Topics Covered) in progress...`);
  const topicsFile = await generateSceneVideo(mod.scenes[0], 1, moduleIndex, false, mod.courseName, mod.moduleNumber, mod.moduleTitle);
  sceneFiles.push(topicsFile);

  // 3. Render Learning Objectives Slide (isTitleSlide = false)
  console.log(`  Scene 3/3 (Learning Objectives) in progress...`);
  const objectivesFile = await generateSceneVideo(mod.scenes[1], 2, moduleIndex, false, mod.courseName, mod.moduleNumber, mod.moduleTitle);
  sceneFiles.push(objectivesFile);

  // Create concat.txt file for concatenation
  const concatPath = path.join(TMP_DIR, `m_${moduleIndex}_concat.txt`);
  const concatContent = sceneFiles.map(f => `file '${path.basename(f)}'`).join('\n');
  fs.writeFileSync(concatPath, concatContent, 'utf8');

  const finalOutPath = path.join(OUT_DIR, mod.filename);

  console.log(`  Concatenating scenes into final video...`);
  return new Promise((resolve, reject) => {
    const concatBatContent = `@echo off
ffmpeg -y -f concat -safe 0 -i "${concatPath}" -c copy "${finalOutPath}"
`;
    const concatBatPath = path.join(TMP_DIR, `m_${moduleIndex}_concat.bat`);
    fs.writeFileSync(concatBatPath, concatBatContent, 'utf8');

    exec(`"${concatBatPath}"`, { cwd: TMP_DIR }, (err: any, _stdout: string, stderr: string) => {
      if (err) reject(new Error(stderr || err.message));
      else {
        console.log(`  Successfully generated: ${finalOutPath}`);
        
        // Extract Thumbnail at t=2.0s
        const thumbnailPath = finalOutPath.replace('.mp4', '.jpg');
        console.log(`  Extracting thumbnail to: ${thumbnailPath}...`);
        
        const thumbCmd = `ffmpeg -y -ss 00:00:02.000 -i "${finalOutPath}" -vframes 1 -q:v 2 "${thumbnailPath}"`;
        exec(thumbCmd, (thumbErr, _thumbStdout, thumbStderr) => {
          if (thumbErr) {
            console.error(`  Warning: Failed to extract thumbnail:`, thumbStderr || thumbErr.message);
          } else {
            console.log(`  Successfully extracted thumbnail: ${thumbnailPath}`);
          }
          resolve();
        });
      }
    });
  });
}

async function main() {
  console.log('=== CareerCode Academy — Modular Syllabus Explainer Video Generator ===');
  ensureDirectories();

  try {
    for (let idx = 0; idx < MODULES.length; idx++) {
      await renderModuleVideo(MODULES[idx], idx);
    }
    console.log('\n=== ALL 14 MODULE VIDEOS COMPLETED SUCCESSFULLY ===');
  } catch (error) {
    console.error('Fatal Error:', error);
  }
}

main();
