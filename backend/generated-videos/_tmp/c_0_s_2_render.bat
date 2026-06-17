@echo off
ffmpeg -y -f lavfi -i "color=c=0x0d1527:s=1280x720:d=7" -filter_complex_script "C:\Users\DELL\Desktop\CareerCode-Academy-wid\backend\generated-videos\_tmp\c_0_s_2_filter.txt" -map [out] -c:v libx264 -preset fast -crf 24 -pix_fmt yuv420p -movflags +faststart "C:\Users\DELL\Desktop\CareerCode-Academy-wid\backend\generated-videos\_tmp\course_0_scene_2.mp4"
