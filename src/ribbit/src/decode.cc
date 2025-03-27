/*
WebAssembly Example 3

Copyright 2019 Ahmet Inan <inan@aicodix.de>
*/
#include <emscripten.h>
#include <stdio.h>
#include <algorithm>
#include "example.hh"
// #include "dsp/quirks.hh"
#include "dsp/complex.hh"
#include "dsp/window.hh"
#include "dsp/filter.hh"
#include "dsp/coeffs.hh"
#include "dsp/decibel.hh"
#include "dsp/fft.hh"
#include "dsp/encoder.hh"
#include "dsp/decoder.hh"

#ifdef __cplusplus
#define EXTERN extern "C"
#else
#define EXTERN
#endif

static const int SPACING = 50;
static const int BINS_44100 = 882; // 44100 / SPACING;
static const int BINS_48000 = 960; // 48000 / SPACING;
static const int BINS_MAX = 960;   // max(BINS_44100, BINS_48000);
float input[BINS_MAX], output[BINS_MAX / 2 + 1];

bool show_rainbow = true;
bool show_phosphor = true;
int draw_color = 0;
int cur_bins = 0;
int cur_rate = 48000;

template <typename TYPE, int WIDTH, int HEIGHT>
struct Image
{
    static const int width = WIDTH;
    static const int height = HEIGHT;
    static const int length = WIDTH * HEIGHT;
    TYPE pixels[length];
    void set(int x, int y, TYPE c)
    {
        if (0 <= x && x < width && 0 <= y && y < height)
            pixels[width * y + x] = c;
    }
    void fill(TYPE c)
    {
        for (int i = 0; i < length; ++i)
            pixels[i] = c;
    }
    void vline(int x, TYPE c)
    {
        if (0 <= x && x < width)
            for (int i = 0; i < height; ++i)
                set(x, i, c);
    }
    void hline(int y, TYPE c)
    {
        if (0 <= y && y < height)
            for (int i = 0; i < width; ++i)
                set(i, y, c);
    }
    // only made for abs(x0-x1) <= 1
    void line(int x0, int y0, int x1, int y1, TYPE c)
    {
        int a0 = std::min(y0, (y0 + y1) / 2);
        int a1 = std::max(y0, (y0 + y1) / 2);
        for (int y = a0; y <= a1; ++y)
            set(x0, y, c);
        int b0 = std::min((y0 + y1) / 2, y1);
        int b1 = std::max((y0 + y1) / 2, y1);
        for (int y = b0; y <= b1; ++y)
            set(x1, y, c);
    }
};

static const int SCOPE_WIDTH = 442; // std::min(BINS_44100, BINS_48000) / 2 + 1;
static const int SCOPE_HEIGHT = SCOPE_WIDTH / 2;
Image<int, SCOPE_WIDTH, SCOPE_HEIGHT> scope;

static const int SPECTRUM_WIDTH = 442; // std::min(BINS_44100, BINS_48000) / 2 + 1;
// static const int SPECTRUM_WIDTH = 81; // 48000 / 2 + 1; //
static const int SPECTRUM_HEIGHT = SPECTRUM_WIDTH / 4;
Image<int, SPECTRUM_WIDTH, SPECTRUM_HEIGHT> spectrum;

static const int SPECTROGRAM_WIDTH = SPECTRUM_WIDTH;
static const int SPECTROGRAM_HEIGHT = SPECTROGRAM_WIDTH / 2;
Image<int, SPECTROGRAM_WIDTH, SPECTROGRAM_HEIGHT> spectrogram;
static Encoder *encoder;
static Decoder *decoder;

// static const int FEED_LENGTH = 98304; used for decoding the wav floats
// static const int FEED_LENGTH = 160;
static const int FEED_LENGTH = 2048; // the buffer size for the audio input
float feed[FEED_LENGTH];

static const int PAYLOAD_LENGTH = 256;
uint8_t payload[PAYLOAD_LENGTH];
int result;

int rgba(float r, float g, float b, float a)
{
    r = std::min(std::max(r, 0.f), 1.f);
    g = std::min(std::max(g, 0.f), 1.f);
    b = std::min(std::max(b, 0.f), 1.f);
    a = std::min(std::max(a, 0.f), 1.f);
    r = sqrt(r);
    g = sqrt(g);
    b = sqrt(b);
    // a = sqrt(a);
    int R = nearbyint(255.f * r);
    int G = nearbyint(255.f * g);
    int B = nearbyint(255.f * b);
    int A = nearbyint(255.f * a);
    return (A << 24) | (B << 16) | (G << 8) | (R << 0);
}
int alpha(float a)
{
    a = std::min(std::max(a, 0.f), 1.f);
    int A = nearbyint(255.f * a);
    return A << 24;
}
int rainbow(float v)
{
    v = std::min(std::max(v, 0.f), 1.f);
    float r = 4.f * v - 2.f;
    float g = 1.f - 4.f * std::abs(v - .5f);
    float b = 2.f - 4.f * v;
    float a = 4.f * v;
    return rgba(r, g, b, a);
}
EXTERN EMSCRIPTEN_KEEPALIVE void myFunction()
{
    printf("my function called!\n");
    return;
}
template <typename TYPE, int BINS, int OVERLAP>
class STFT
{
    typedef TYPE value_type;
    typedef DSP::Complex<value_type> complex_type;
    DSP::Hann<value_type> window;
    DSP::LowPass2<value_type> filter;
    DSP::Coeffs<BINS * OVERLAP, value_type, true> win;
    DSP::RealToHalfComplexTransform<BINS, complex_type> fwd;
    value_type inp[BINS], tmp[BINS * (OVERLAP - 1)];
    complex_type out[BINS / 2 + 1];

public:
    STFT() : filter(1, BINS), win(&window, &filter) {}
    void operator()(value_type *dB, const value_type *sig)
    {
        for (int i = 0; i < BINS; ++i)
            inp[i] = win[i + BINS * (OVERLAP - 1)] * sig[i];
        for (int j = 0; j < OVERLAP - 1; ++j)
            for (int i = 0; i < BINS; ++i)
                inp[i] += win[BINS * j + i] * tmp[BINS * j + i];
        for (int j = 0; j < OVERLAP - 2; ++j)
            for (int i = 0; i < BINS; ++i)
                tmp[BINS * j + i] = tmp[BINS * (j + 1) + i];
        for (int i = 0; i < BINS; ++i)
            tmp[BINS * (OVERLAP - 2) + i] = sig[i];
        fwd(out, inp);
        for (int i = 0; i < BINS / 2 + 1; ++i)
            dB[i] = DSP::decibel(norm(out[i]));
    }
};
static const int OVERLAP = 3;
STFT<float, BINS_44100, OVERLAP> stft_44100;
STFT<float, BINS_48000, OVERLAP> stft_48000;
float dB_avg[SPECTRUM_WIDTH], avg_max;

// // Usage:
// float array[160];
// // ... fill the array ...
// std::string arrayStr = arrayToString(array, 160);

EXTERN EMSCRIPTEN_KEEPALIVE void stft()
{
    if (cur_rate == 44100)
    {
        stft_44100(output, input);
    }
    else if (cur_rate == 48000)
    {
        stft_48000(output, input);
    }

    if (show_phosphor)
    {
        for (int i = 0; i < spectrum.length; ++i)
            spectrum.pixels[i] = draw_color |
                                 (((((spectrum.pixels[i] >> 24) & 255) * 7) >> 3) << 24);
        for (int i = 0; i < scope.length; ++i)
            scope.pixels[i] = draw_color |
                              (((((scope.pixels[i] >> 24) & 255) * 7) >> 3) << 24);
    }
    else
    {
        spectrum.fill(draw_color);
        scope.fill(draw_color);
    }
    for (int b = 0, i0, j0; b < scope.width; ++b)
    {
        float scale = (scope.height - 1) / 2.f;
        int v = nearbyint(scale * (1.f - input[b]));
        int i1 = b;
        int j1 = v;
        if (b)
            scope.line(i0, j0, i1, j1, 0xff000000 | draw_color);
        i0 = i1;
        j0 = j1;
    }
    for (int i = 0; i < spectrum.width; ++i)
        dB_avg[i] = DSP::lerp(dB_avg[i], output[i], 0.05f);
    float tmp_min = dB_avg[0];
    for (int i = 1; i < spectrum.width; ++i)
        tmp_min = std::min(tmp_min, dB_avg[i]);
    float dB_min = std::max(tmp_min, -120.f);
    float tmp_max = output[0];
    for (int i = 1; i < spectrum.width; ++i)
        tmp_max = std::max(tmp_max, output[i]);
    avg_max = DSP::lerp(avg_max, tmp_max, avg_max < tmp_max ? 0.5f : 0.05f);
    float dB_max = avg_max;
    for (int b = 0, i0, j0; b < spectrum.width; ++b)
    {
        float dB = output[b];
        float scale = (spectrum.height - 1) / (dB_min - dB_max);
        int v = nearbyint(scale * (dB - dB_max));
        int i1 = b;
        int j1 = std::min(std::max(v, 0), spectrum.height - 1);
        if (b)
            spectrum.line(i0, j0, i1, j1, 0xff000000 | draw_color);
        i0 = i1;
        j0 = j1;
    }
    for (int j = spectrogram.height - 1; j; --j)
        for (int i = 0; i < spectrogram.width; ++i)
            spectrogram.pixels[spectrogram.width * j + i] = spectrogram.pixels[spectrogram.width * (j - 1) + i];
    for (int b = 0; b < spectrogram.width; ++b)
    {
        float dB = output[b];
        float v = (1.f / (dB_min - dB_max)) * (dB - dB_max);
        if (show_rainbow)
            spectrogram.pixels[b] = rainbow(1.f - v);
        else
            spectrogram.pixels[b] = alpha(1.f - v) | draw_color;
    }
}
EXTERN EMSCRIPTEN_KEEPALIVE void change_rate(int rate)
{
    cur_rate = rate;
    if (cur_rate == 44100)
        cur_bins = BINS_44100;
    else
        cur_bins = BINS_48000;
}
EXTERN EMSCRIPTEN_KEEPALIVE void toggle_rainbow()
{
    show_rainbow = !show_rainbow;
}
EXTERN EMSCRIPTEN_KEEPALIVE void toggle_phosphor()
{
    show_phosphor = !show_phosphor;
}
EXTERN EMSCRIPTEN_KEEPALIVE void change_color(int color)
{
    draw_color = 0x00ffffff & color;
}
EXTERN EMSCRIPTEN_KEEPALIVE int input_length()
{
    return cur_bins;
}
EXTERN EMSCRIPTEN_KEEPALIVE float *input_pointer()
{
    return input;
}
EXTERN EMSCRIPTEN_KEEPALIVE int scope_length()
{
    return scope.length;
}
EXTERN EMSCRIPTEN_KEEPALIVE int scope_width()
{
    return scope.width;
}
EXTERN EMSCRIPTEN_KEEPALIVE int scope_height()
{
    return scope.height;
}
EXTERN EMSCRIPTEN_KEEPALIVE int *scope_pointer()
{
    return scope.pixels;
}
EXTERN EMSCRIPTEN_KEEPALIVE int spectrum_length()
{
    return spectrum.length;
}
EXTERN EMSCRIPTEN_KEEPALIVE int spectrum_width()
{
    return spectrum.width;
}
EXTERN EMSCRIPTEN_KEEPALIVE int spectrum_height()
{
    return spectrum.height;
}
EXTERN EMSCRIPTEN_KEEPALIVE int *spectrum_pointer()
{
    return spectrum.pixels;
}
EXTERN EMSCRIPTEN_KEEPALIVE int spectrogram_length()
{
    return spectrogram.length;
}
EXTERN EMSCRIPTEN_KEEPALIVE int spectrogram_width()
{
    return spectrogram.width;
}
EXTERN EMSCRIPTEN_KEEPALIVE int spectrogram_height()
{
    return spectrogram.height;
}
EXTERN EMSCRIPTEN_KEEPALIVE int *spectrogram_pointer()
{
    return spectrogram.pixels;
}
EXTERN EMSCRIPTEN_KEEPALIVE void createEncoder()
{
    printf("Encoder created!\n");
    encoder = new Encoder();
    EM_ASM({ encoderCreated($0); }, (int)encoder);
    return;
}
EXTERN EMSCRIPTEN_KEEPALIVE float *feed_pointer()
{
    return feed;
}
EXTERN EMSCRIPTEN_KEEPALIVE int feed_length()
{
    return FEED_LENGTH;
}
EXTERN EMSCRIPTEN_KEEPALIVE void createDecoder()
{
    decoder = new Decoder();
    if (decoder)
    {
        printf("Decoder created!\n");
        EM_ASM({ decoderCreated($0); }, (int)decoder);
    }
}
EXTERN EMSCRIPTEN_KEEPALIVE void fetchDecoder()
{
    uint8_t *pl;
    result = decoder->fetch(pl);
    for (int i = 0; i < PAYLOAD_LENGTH; i++)
    {
        payload[i] = pl[i];
    }
    EM_ASM({ fetchDecoded($0); }, result);
}
EXTERN EMSCRIPTEN_KEEPALIVE void readFeed(const float *audio_buffer, int sampleCount)
{
    if (decoder != nullptr)
    {
        printf("Read feed called! \n");
        for (int i = 0; i < sampleCount; i++)
        {
            printf(" %f", audio_buffer[i]);
        }
        printf("\n");
    }
}
EXTERN EMSCRIPTEN_KEEPALIVE void feedDecoderChunk(const float *audio_chunk, int sampleCount)
{
    if (decoder != nullptr)
    {
        bool fetch = false;
        printf("Feeding decoder! \n");
        fetch = decoder->feed(audio_chunk, sampleCount, 0);
        if (fetch)
        {
            printf("FETCH DECODER?\n");
            fetchDecoder();
        }
        EM_ASM({ decoderFed($0); }, fetch);
    }
}
EXTERN EMSCRIPTEN_KEEPALIVE void feedDecoder(const float *audio_buffer, int sampleCount)
{
    // if (decoder != nullptr)
    // {
        bool fetch = false;
        // printf("Feeding decoder! \n");
        // for (int i = 0; i < sampleCount; i += 160)
        // {
            fetch = decoder->feed(audio_buffer, 160, 0);
            if (fetch)
            {
                printf("FETCH DECODER?\n");
                fetchDecoder();
            }
        // }
        EM_ASM({ decoderFed($0); }, fetch);
    // }
}
EXTERN EMSCRIPTEN_KEEPALIVE void fetchPayload()
{
    if (decoder)
    {
        bool fetched = false;
        fetched = decoder->fetch(payload);
        if (fetched)
        {
            EM_ASM({ fetchPayload(); });
        }
    }
}
EXTERN EMSCRIPTEN_KEEPALIVE void *payload_pointer()
{
    return payload;
}
EXTERN EMSCRIPTEN_KEEPALIVE int payload_length()
{
    return PAYLOAD_LENGTH;
}
EXTERN EMSCRIPTEN_KEEPALIVE void processFloatArray()
{
    for (int i = 0; i < FEED_LENGTH; i += 100)
    {
        if (i < FEED_LENGTH)
        {
            printf(" %f ", feed[i]);
        }
    }
    printf("\n");
}
static const int MESSAGE_LENGTH = 256;
uint8_t message[MESSAGE_LENGTH];
EXTERN EMSCRIPTEN_KEEPALIVE void *message_pointer()
{
    return message;
}
EXTERN EMSCRIPTEN_KEEPALIVE int message_length()
{
    return MESSAGE_LENGTH;
}
EXTERN EMSCRIPTEN_KEEPALIVE void initEncoder()
{
    for (int i = 0; i < MESSAGE_LENGTH; i++)
    {
        printf("%u,", message[i]);
    }
    printf("\n");

    encoder->init(message);
}
static const int SIGNAL_LENGTH = 4096 * 4;
float signal[SIGNAL_LENGTH];
EXTERN EMSCRIPTEN_KEEPALIVE float *signal_pointer()
{
    return signal;
}
EXTERN EMSCRIPTEN_KEEPALIVE int signal_length()
{
    return SIGNAL_LENGTH;
}
EXTERN EMSCRIPTEN_KEEPALIVE void readEncoder()
{
    encoder->read(signal, SIGNAL_LENGTH);
}
