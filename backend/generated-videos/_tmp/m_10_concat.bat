@echo off
ffmpeg -y -f concat -safe 0 -i "C:\Users\DELL\Desktop\CareerCode-Academy-wid\backend\generated-videos\_tmp\m_10_concat.txt" -c copy "C:\Users\DELL\Desktop\CareerCode-Academy-wid\backend\generated-videos\CareerCode_RWD_Module_4_Layout_Systems.mp4"
