@echo off
ffmpeg -y -f concat -safe 0 -i "C:\Users\DELL\Desktop\CareerCode-Academy-wid\backend\generated-videos\_tmp\m_11_concat.txt" -c copy "C:\Users\DELL\Desktop\CareerCode-Academy-wid\backend\generated-videos\CareerCode_RWD_Module_5_Responsive_Design.mp4"
