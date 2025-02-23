title=Phosphoros[Arpus]
artist=空澄わやぬお
effect=Arpus
jacket=../../BEATECH_ORIGINAL_6th/01_Phosphoros/Phosphoros.jpg
illustrator=FAT1MA
difficulty=infinite
level=10
t=180
to=180
m=../../BEATECH_ORIGINAL_6th/01_Phosphoros/01_Phosphoros.ogg
o=0
bg=space
layer=arrow
po=86666
plength=13000
pfiltergain=50
filtertype=peak
chokkakuautovol=0
chokkakuvol=50
information=Reference from O.N.G.E.K.I.
icon=../btch6th.png
ver=171
--
beat=4/4
0000|00|--
--
fx-r=
0100|01|--
0000|01|--
1201|01|--
0200|01|--
--
0020|00|-o
0020|00|-:
0020|00|-:
0020|00|-:
0020|00|-:
0020|00|-:
0020|00|-0
0020|00|-:
1020|00|-:
0020|00|-:
0020|00|-:
0020|00|-:
1020|00|-o
0020|00|--
0020|00|--
0020|00|--
--
0000|20|--
0000|00|--
0000|20|--
0000|00|--
0000|20|--
0000|00|--
--
fx-l=
0000|10|0-
0000|10|:-
0000|10|o-
0000|10|--
0000|10|--
0000|10|--
0000|10|--
0000|10|--
0000|10|--
0000|10|--
0000|10|--
0000|10|--
0000|10|--
0000|10|--
0000|10|--
0000|10|--
0000|10|0-
0000|10|:-
0000|10|o-
0000|10|--
0000|10|--
0000|10|--
0000|10|--
0000|10|--
0000|10|--
0000|10|--
0000|10|--
0000|10|--
0000|10|--
0000|10|--
0000|10|--
0000|10|--
0000|10|0-
0000|10|:-
0000|10|:-
0000|10|:-
0000|10|:-
0000|10|:-
0000|10|:-
0000|10|:-
0000|10|:-
0000|10|:-
0000|10|:-
0000|10|:-
0000|10|:-
0000|10|:-
0000|10|:-
0000|10|:-
0000|10|o-
0000|10|:-
0000|10|:-
0000|10|:-
0000|10|:-
0000|10|:-
0000|10|:-
0000|10|:-
0000|10|:-
0000|10|:-
0000|10|:-
0000|10|:-
0000|10|:-
0000|10|:-
0000|10|:-
0000|10|:-
--
0001|00|0-
0000|00|--
0000|00|--
0000|00|--
0000|00|--
0000|00|--
0000|00|--
0000|00|--
0000|00|--
0000|00|--
0000|00|--
0000|00|--
0000|00|--
0000|00|--
0000|00|--
0000|00|--
0000|00|--
0000|00|--
0000|00|--
0000|00|--
0000|00|--
0000|00|--
0000|00|--
0000|00|--
0000|00|--
0000|00|--
0000|00|--
0000|00|--
0000|00|--
0000|00|--
0000|00|--
0000|00|--
0010|00|0-
0000|00|:-
0000|00|o-
0000|00|--
0000|00|--
0000|00|--
0000|00|--
0000|00|--
0000|00|--
0000|00|--
0000|00|--
0000|00|--
0000|00|--
0000|00|--
0000|00|--
0000|00|--
0000|00|--
0000|00|--
0000|00|--
0000|00|--
0000|00|--
0000|00|--
0000|00|--
0000|00|--
0000|00|--
0000|00|--
0000|00|--
0000|00|--
0000|00|--
0000|00|--
0000|00|--
0000|00|--
--
fx-r=
0000|01|--
0000|01|--
--
0000|01|--
--
0020|00|--
0020|00|--
0000|00|--
0000|00|--
0200|00|--
0200|00|--
0000|00|--
0000|00|--
0020|00|--
0020|00|--
0022|00|--
0022|00|--
0020|00|--
0020|00|--
0020|00|--
0020|00|--
--
0000|00|--
0000|00|--
--
#define_fx     4Re  type=Retrigger; updatePeriod=1/4;  rate=70%; mix=0%>90%
#define_fx     wRe  type=Retrigger; updatePeriod=1/2;  rate=70%; mix=0%>60%
#define_fx     sRe  type=Retrigger; updatePeriod=1/2;  rate=40%; mix=0%>90%
#define_fx     dRe  type=Retrigger; updatePeriod=1/2;  rate=80%; mix=0%>90%
#define_fx     wGa  type=Gate;                         rate=70%;          mix=0%>60%
#define_fx     sGa  type=Gate;                         rate=40%;          mix=0%>90%
#define_fx     dGa  type=Gate;                         rate=80%;          mix=0%>90%
#define_fx     Dlay type=Flanger;                      delay=3000samples; depth=0samples;   feedback=80%;                              mix=0%>100%
#define_fx     Chor type=Flanger;   period=0.375;      delay=30samples;   depth=200samples; feedback=90%; stereoWidth=80%;             mix=0%>100%
#define_fx     hiFl type=Flanger;   period=1/2;        delay=65samples;   depth=20samples;  feedback=97%; stereoWidth=15%; volume=80%
#define_fx     loFl type=Flanger;   period=1/2;        delay=60samples;   depth=75samples;  feedback=85%
#define_fx     dPh  type=Phaser;                                            Q=0.3;  feedback=70%; mix=0%>60%
#define_fx     sP8  type=Phaser; period=1/8;                                Q=0.02; feedback=50%; mix=0%>90%
#define_fx     sP12 type=Phaser; period=1/12;                               Q=0.02; feedback=50%; mix=0%>90%
#define_fx     sP16 type=Phaser; period=1/16;                               Q=0.02; feedback=50%; mix=0%>90%
#define_fx     PhWo type=Phaser; period=1/12; loFreq=20000Hz; hiFreq=500Hz; Q=5;    feedback=50%; mix=0%>85%
#define_fx     LPF  type=Wobble; waveLength=1; loFreq=2000Hz; hiFreq=2000Hz; Q=5.0; mix=0%>85%
#define_fx     HPF  type=Wobble; waveLength=1; loFreq=6500Hz; hiFreq=6500Hz; Q=5.0; mix=0%>85%
#define_fx     wTS  type=TapeStop;  speed=50%; trigger=off>on;mix=0%>60%           
#define_filter Pup  type=PitchShift; pitch=0.0-12.0;                                mix=0%>60%
#define_filter Pdw  type=PitchShift; pitch=0.0--12.0;                               mix=0%>60%
#define_filter *LPF type=Wobble; waveLength=1; loFreq=2000Hz; hiFreq=2000Hz; Q=5.0; mix=0%>85%
#define_filter *HPF type=Wobble; waveLength=1; loFreq=6500Hz; hiFreq=6500Hz; Q=5.0; mix=0%>85%
#define_filter fRe4 type=Retrigger; updatePeriod=0; waveLength=1/4; rate=95%; mix=0%
