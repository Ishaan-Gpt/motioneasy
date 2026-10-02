# Reassembly

`film.mp4` is stored in 10MB chunks because GitHub rejects single API uploads
of this size. Reassemble with:

    cat film.mp4.part-* > film.mp4

Then verify with `ffprobe film.mp4` (should read 30s, 1080x1920).
