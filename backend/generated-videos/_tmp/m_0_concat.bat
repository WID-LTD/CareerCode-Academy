@echo off
ffmpeg -y -f concat -safe 0 -i "C:\Users\DELL\Desktop\CareerCode-Academy-wid\backend\generated-videos\_tmp\m_0_concat.txt" -c copy "C:\Users\DELL\Desktop\CareerCode-Academy-wid\backend\generated-videos\CareerCode_JS_Module_1_JavaScript_Fundamentals.mp4"
