from pathlib import Path
import subprocess, math, wave, json
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parent
ASSETS=ROOT/'assets'
W,H,FPS,DURATION=1080,1920,30,24
INK=(5,27,39); BLUE=(0,174,222); WHITE=(255,255,255)
FONT='/System/Library/Fonts/Supplemental/Arial Bold.ttf'
DISPLAY='/System/Library/Fonts/Supplemental/DIN Condensed Bold.ttf'
REG='/System/Library/Fonts/Supplemental/Arial.ttf'
cache={}
def font(size,kind='body'):
    key=(size,kind)
    if key not in cache: cache[key]=ImageFont.truetype(DISPLAY if kind=='display' else REG if kind=='regular' else FONT,size)
    return cache[key]
def ease(x):return 1-(1-max(0,min(1,x)))**3
def text(im,label,x,y,size=44,color=WHITE,kind='body'):
    ImageDraw.Draw(im).text((x,y),label,font=font(size,kind),fill=color,stroke_width=0)
def centered(im,label,y,size=44,color=INK,kind='body'):
    d=ImageDraw.Draw(im);f=font(size,kind);b=d.textbbox((0,0),label,font=f)
    text(im,label,(W-(b[2]-b[0]))/2,y,size,color,kind)
def tracked(im,label,x,y,size=24,color=WHITE,spacing=5):
    d=ImageDraw.Draw(im);f=font(size)
    for char in label:
        d.text((x,y),char,font=f,fill=color);x+=d.textlength(char,font=f)+spacing
def crop_cover(im,w,h,z=1,cx=.5,cy=.5):
    scale=max(w/im.width,h/im.height)*z
    cw=w/scale;ch=h/scale
    left=max(0,min(im.width-cw,im.width*cx-cw/2));top=max(0,min(im.height-ch,im.height*cy-ch/2))
    return im.resize((w,h),Image.Resampling.BICUBIC,box=(left,top,left+cw,top+ch))

# Decode the supplied clip, retaining its natural motion. No invented video footage.
probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','json',str(ASSETS/'source-video.mp4')]))
raw=subprocess.check_output(['ffmpeg','-hide_banner','-loglevel','error','-i',str(ASSETS/'source-video.mp4'),'-an','-vf','fps=30,scale=464:832','-f','rawvideo','-pix_fmt','rgb24','-'])
video=np.frombuffer(raw,dtype=np.uint8).reshape(-1,832,464,3)
beer=Image.open(ASSETS/'drinks-on-ice.jpeg').convert('RGB')
malt=Image.open(ASSETS/'malt-on-ice.jpeg').convert('RGB')
malta_ice=Image.open(ASSETS/'malta-ice.jpg').convert('RGB')
coke=Image.open(ASSETS/'coke-on-ice.jpeg').convert('RGB')
sodas=Image.open(ASSETS/'sodas-ice.jpg').convert('RGB')
logo=Image.open(ASSETS/'logo.jpeg').convert('RGB')

# Original stereo score: warm keys, restrained bass, syncopated percussion and ice-like chimes.
SR=48000;N=SR*DURATION;rng=np.random.default_rng(52);audio=np.zeros((N,2),np.float64)
beat=60/112
def add(start,s,pan=0):
    i=int(start*SR)
    if i>=N:return
    s=s[:min(len(s),N-i)]
    audio[i:i+len(s),0]+=s*math.sqrt((1-pan)/2)
    audio[i:i+len(s),1]+=s*math.sqrt((1+pan)/2)
def sine(freq,length,decay,amp=.1):
    t=np.arange(int(SR*length))/SR
    return (np.sin(2*np.pi*freq*t)+.15*np.sin(2*np.pi*freq*2*t))*np.minimum(t/.008,1)*np.exp(-decay*t)*amp
chords=[[130.81,155.56,196.00,233.08],[103.83,130.81,155.56,196],[155.56,196,233.08,293.66],[116.54,146.83,174.61,220]]
for bar in range(12):
    start=bar*4*beat
    if start>=DURATION:break
    chord=chords[bar%4];t=np.arange(int(SR*2.6))/SR
    env=np.minimum(t/.16,1)*np.exp(-t*1.5)
    pad=sum(np.sin(2*np.pi*f*t)+.12*np.sin(2*np.pi*f*2.003*t) for f in chord)*env*.025
    add(start,pad,-.22);add(start+.025,pad,.22)
for b in range(math.ceil(DURATION/beat)):
    start=b*beat
    if start>22:continue
    t=np.arange(int(.32*SR))/SR
    kick=np.sin(2*np.pi*(48*t+2.2*(1-np.exp(-t/0.025))))*np.exp(-t*15)*.42
    add(start,kick)
    if b%2:
        t=np.arange(int(.13*SR))/SR;noise=rng.normal(size=len(t));noise=np.diff(noise,prepend=0)
        add(start,noise*np.exp(-t*40)*.055,.1)
    for off,pan in [(.25,-.45),(.5,.4),(.75,-.25)]:
        t=np.arange(int(.045*SR))/SR;noise=rng.normal(size=len(t));noise=np.diff(noise,prepend=0)
        add(start+off*beat,noise*np.exp(-t*100)*.024,pan)
    root=chords[(b//4)%4][0]/2
    if b%4 in [0,2,3]:add(start+.04,sine(root,.48,7,.15))
    if b%2==0:
        f=chords[(b//4)%4][(b//2)%4]*4
        note=sine(f,.7,6,.055);add(start+beat*.5,note,-.35);add(start+beat*.5+.19,note*.24,.45)
for cut in [3,6,9,12,16,19]:
    t=np.arange(int(.22*SR))/SR;n=rng.normal(size=len(t))
    add(cut-.15,n*np.sin(np.pi*t/.22)**2*.035,-.3)
    add(cut,sine(1600,.3,20,.045),.3)
add(19,sine(523.25,2.6,1.9,.11));add(19,sine(783.99,2.6,2.1,.055),.3)
timeline=np.arange(N)/SR
audio*=np.minimum(timeline/.12,1)[:,None]*np.clip((DURATION-timeline)/1.3,0,1)[:,None]
audio=np.tanh(audio);audio*=.8/np.max(np.abs(audio))
with wave.open(str(ASSETS/'original-score.wav'),'wb') as out:
    out.setnchannels(2);out.setsampwidth(2);out.setframerate(SR);out.writeframes((audio*32767).astype('<i2').tobytes())

# Overlays are composed as video graphics; supplied photographs stay intact on disk.
Y=np.arange(H)[:,None];shade=np.zeros((H,W,4),np.uint8)
shade[:,:,3]=np.broadcast_to(np.clip(135*np.exp(-Y/360)+220*np.exp(-(H-Y)/490),0,230),(H,W)).astype(np.uint8)
overlay=Image.fromarray(shade)
def grade(im):
    return Image.alpha_composite(im.convert('RGBA'),overlay).convert('RGB')
def brand(im,dark=False):
    color=INK if dark else WHITE
    tracked(im,'GEES CHILLS',72,122,25,color,3)
    text(im,'GHANA',866,124,22,color)
    ImageDraw.Draw(im).line((72,174,1008,174),fill=(175,207,219) if dark else (155,178,185),width=1)
def caption(im,kicker,lines,local,accent=-1,backing=False):
    y=1305+int(38*(1-ease(local/.5)))
    if backing:
        panel=Image.new('RGBA',im.size,(0,0,0,0))
        ImageDraw.Draw(panel).rounded_rectangle((44,y-110,1036,y+len(lines)*133+22),radius=18,fill=(3,18,27,155))
        im.paste(Image.alpha_composite(im.convert('RGBA'),panel).convert('RGB'))
    tracked(im,kicker,72,y-88,23,WHITE,4)
    for i,line in enumerate(lines):text(im,line,68,y+i*133,150,BLUE if i==accent else WHITE,'display')
def frame(t):
    if t<3:
        v=min(len(video)-1,round(t/3*(len(video)-1)))
        im=grade(crop_cover(Image.fromarray(video[v]),W,H,1.005))
        brand(im);caption(im,'THE CHILL YOUR EVENT DESERVES',['GOOD TIMES.','START COLD.'],t,1,True)
    elif t<6:
        q=t-3;im=grade(crop_cover(malt,W,H,1.02+.035*q,.5,.48+.012*q))
        brand(im);caption(im,'REFRESHING FROM THE START',['THE FIRST SIP.'],q,backing=True)
    elif t<9:
        q=t-6;im=grade(crop_cover(beer,W,H,1.12-.025*q,.51,.5))
        brand(im);caption(im,'HERE’S TO THE GOOD TIMES',['THE NEXT TOAST.'],q,backing=True)
    elif t<12:
        q=t-9
        im=grade(crop_cover(malta_ice,W,H,1.01+.015*q,.5,.5))
        brand(im);caption(im,'YOU BRING THE PEOPLE',['WE BRING','THE CHILL.'],q,1)
    elif t<16:
        q=t-12;im=Image.new('RGB',(W,H),(247,250,251));brand(im,True)
        text(im,'SMALL GATHERINGS.',67,250,115,INK,'display')
        text(im,'BIG CELEBRATIONS.',67,372,115,(0,137,178),'display')
        # Preserve the selected Coke photo's native 2:3 proportions.
        photo=coke.resize((720,1080),Image.Resampling.LANCZOS)
        im.paste(photo,(180,570))
        centered(im,'GOOD COMPANY. COLD DRINKS.',1720,30,INK)
    elif t<19:
        q=t-16;im=grade(crop_cover(sodas,W,H,1.01+.012*q,.5,.48))
        brand(im);caption(im,'YOUR OCCASION. YOUR PEOPLE.',['AND EVERYTHING','IN BETWEEN.'],q,1)
    else:
        q=t-19;im=Image.new('RGB',(W,H),WHITE)
        # Keep the user's mark and its white background unchanged.
        mark=logo.crop((244,175,551,613)).resize((307,438),Image.Resampling.LANCZOS)
        im.paste(mark,((W-mark.width)//2,235))
        centered(im,'EVERY EVENT.',812,144,INK,'display')
        centered(im,'THE RIGHT PACKAGE.',956,117,(0,137,178),'display')
        centered(im,'Cooler hire for your next occasion.',1129,34,INK,'regular')
        d=ImageDraw.Draw(im);d.rounded_rectangle((220,1302,860,1410),radius=8,fill=INK)
        centered(im,'DM TO ENQUIRE',1337,32,WHITE)
        centered(im,'Your date. Your location. Your guest count.',1475,28,INK,'regular')
        tracked(im,'GEES CHILLS',72,1720,22,INK,3);text(im,'GHANA',895,1720,22,INK)
        d.line((72,1680,1008,1680),fill=(210,225,231),width=1)
    # Brief clean flash at the change to the white editorial spread and end card.
    for cut in [12,19]:
        if cut-.10<t<cut:
            im=Image.blend(im,Image.new('RGB',(W,H),WHITE),(t-(cut-.10))/.10*.7)
    return im

cmd=['ffmpeg','-y','-hide_banner','-loglevel','error','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-i',str(ASSETS/'original-score.wav'),'-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-af','loudnorm=I=-16:TP=-3:LRA=9','-c:a','aac','-b:a','192k','-ar','48000','-movflags','+faststart','-t',str(DURATION),str(ROOT/'gees-chills-premium-v8.mp4')]
p=subprocess.Popen(cmd,stdin=subprocess.PIPE)
for n in range(FPS*DURATION):
    p.stdin.write(frame(n/FPS).tobytes())
    if n%120==0:print(f'Rendered {n}/{FPS*DURATION}',flush=True)
p.stdin.close()
if p.wait():raise RuntimeError('Encoding failed')
frame(21).save(ROOT/'gees-chills-cover-v8.jpg',quality=96)
sheet=Image.new('RGB',(7*216,384))
for i,t in enumerate([1.5,4.5,7.5,10.5,14,17.5,21]):sheet.paste(frame(t).resize((216,384)),(i*216,0))
sheet.save(ROOT/'storyboard.jpg',quality=94)
print('Finished',flush=True)
