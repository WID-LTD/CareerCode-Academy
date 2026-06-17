@echo off
ffmpeg -y -f concat -safe 0 -i "C:\Users\DELL\Desktop\CareerCode-Academy-wid\backend\generated-videos\_tmp\m_6_concat.txt" -c copy "C:\Users\DELL\Desktop\CareerCode-Academy-wid\backend\generated-videos\CareerCode_JS_Module_7_Interview_Preparation.mp4"
