#include "finders.h"
#include "generator.h"
#include "util.h"

#include <string.h>

static int div_floor(int value, int span) {
    int quotient = value / span;
    if (value < 0 && value % span != 0) {
        quotient -= 1;
    }
    return quotient;
}

static Generator generator;
static uint64_t world_seed;
static int ready;

static uint64_t pack_seed(uint32_t lo, uint32_t hi) {
    return ((uint64_t) hi << 32) | (uint64_t) lo;
}

int cm_apply(int mc, int dim, uint32_t lo, uint32_t hi) {
    setupGenerator(&generator, mc, 0);
    world_seed = pack_seed(lo, hi);
    applySeed(&generator, dim, world_seed);
    ready = 1;
    return 1;
}

int cm_biomes(int x, int z, int sx, int sz, int scale, int *out) {
    Range range;
    int height;

    if (!ready || sx <= 0 || sz <= 0 || out == NULL) {
        return -1;
    }
    memset(&range, 0, sizeof range);
    range.scale = scale;
    range.x = scale <= 1 ? x : div_floor(x, scale);
    range.z = scale <= 1 ? z : div_floor(z, scale);
    range.sx = sx;
    range.sz = sz;
    range.sy = 1;
    height = scale == 1 ? 63 : 16;
    if (generator.dim == DIM_NETHER || generator.dim == DIM_END) {
        height = scale == 1 ? 64 : 16;
    }
    range.y = height;
    return genBiomes(&generator, out, range);
}

const char *cm_biome_name(int id) {
    const char *name = biome2str(generator.mc, id);
    return name != NULL ? name : "";
}

int cm_structures(int structure, int min_x, int min_z, int max_x, int max_z, int *out, int cap) {
    StructureConfig config;
    int span;
    int region_x0;
    int region_z0;
    int region_x1;
    int region_z1;
    int region_x;
    int region_z;
    int count = 0;

    if (!ready || out == NULL || cap <= 0) {
        return 0;
    }
    if (!getStructureConfig(structure, generator.mc, &config) || config.regionSize <= 0) {
        return 0;
    }
    span = config.regionSize * 16;
    region_x0 = div_floor(min_x, span) - 1;
    region_z0 = div_floor(min_z, span) - 1;
    region_x1 = div_floor(max_x, span) + 1;
    region_z1 = div_floor(max_z, span) + 1;
    for (region_z = region_z0; region_z <= region_z1; region_z++) {
        for (region_x = region_x0; region_x <= region_x1; region_x++) {
            Pos pos;
            if (!getStructurePos(structure, generator.mc, world_seed, region_x, region_z, &pos)) {
                continue;
            }
            if (pos.x < min_x || pos.x > max_x || pos.z < min_z || pos.z > max_z) {
                continue;
            }
            if (count >= cap) {
                return count;
            }
            out[count * 3] = pos.x;
            out[count * 3 + 1] = pos.z;
            out[count * 3 + 2] = isViableStructurePos(structure, &generator, pos.x, pos.z, 0);
            count++;
        }
    }
    return count;
}

int cm_strongholds(int min_x, int min_z, int max_x, int max_z, int *out, int cap) {
    StrongholdIter iter;
    int left;
    int guard = 0;
    int count = 0;

    if (!ready || out == NULL || cap <= 0 || generator.dim != DIM_OVERWORLD) {
        return 0;
    }
    memset(&iter, 0, sizeof iter);
    initFirstStronghold(&iter, generator.mc, world_seed);
    left = 1;
    while (left > 0 && guard < 48 && count < cap) {
        left = nextStronghold(&iter, &generator);
        guard++;
        if (iter.pos.x < min_x || iter.pos.x > max_x || iter.pos.z < min_z || iter.pos.z > max_z) {
            continue;
        }
        out[count * 2] = iter.pos.x;
        out[count * 2 + 1] = iter.pos.z;
        count++;
    }
    return count;
}
