@echo off
ffmpeg -y -f lavfi -i "color=c=0x0d1527:s=1280x720:d=8" -filter_complex_script "C:\Users\DELL\Desktop\CareerCode-Academy-wid\backend\generated-videos\_tmp\m_13_s_1_filter.txt" -map [out] -c:v libx264 -preset fast -crf 24 -pix_fmt yuv420p -movflags +faststart "C:\Users\DELL\Desktop\CareerCode-Academy-wid\backend\generated-videos\_tmp\mod_13_scene_1.mp4"
