/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumns('band_profiles', {
    rider_channel_inputs: {
      type: 'varchar(100)',
    },
    rider_sound_system: {
      type: 'text',
    },
    rider_instruments: {
      type: 'text',
    },
    rider_hospitality: {
      type: 'text',
    },
    spotify_url: {
      type: 'varchar(500)',
    },
    tiktok_url: {
      type: 'varchar(500)',
    },
  });
};

exports.down = (pgm) => {
  pgm.dropColumns('band_profiles', [
    'rider_channel_inputs',
    'rider_sound_system',
    'rider_instruments',
    'rider_hospitality',
    'spotify_url',
    'tiktok_url',
  ]);
};
