import {
  MediaConflictError,
  MediaNameConflictError,
  MediaNotFoundError,
  RecipeValidationError,
} from '../src/errors.js';
import { NAME_CONFLICT_CODE, mediaErrorToHttp } from '../src/http-errors.js';

describe('mediaErrorToHttp', () => {
  it('maps a name conflict to a 409 carrying the suggested free name', () => {
    const conflict = new MediaNameConflictError('m/pf/i/hero.png', {
      name: 'hero-2',
      filename: 'hero-2.png',
      path: 'm/pf/i/hero-2.png',
    });
    expect(mediaErrorToHttp(conflict)).toEqual({
      statusCode: 409,
      statusMessage: conflict.message,
      data: {
        code: NAME_CONFLICT_CODE,
        path: 'm/pf/i/hero.png',
        suggestedName: 'hero-2',
        suggestedFilename: 'hero-2.png',
        suggestedPath: 'm/pf/i/hero-2.png',
      },
    });
    expect(NAME_CONFLICT_CODE).toBe('name_conflict');
  });

  it('maps the other domain errors and ignores unknown ones', () => {
    expect(mediaErrorToHttp(new MediaConflictError('busy'))).toEqual({ statusCode: 409, statusMessage: 'busy' });
    expect(mediaErrorToHttp(new MediaNotFoundError('gone'))).toEqual({ statusCode: 404, statusMessage: 'gone' });
    expect(mediaErrorToHttp(new RecipeValidationError('bad'))).toEqual({ statusCode: 400, statusMessage: 'bad' });
    expect(mediaErrorToHttp(new Error('boom'))).toBeNull();
    expect(mediaErrorToHttp('nope')).toBeNull();
  });
});
