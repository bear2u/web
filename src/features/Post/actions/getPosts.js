import { put, select, takeEvery } from 'redux-saga/effects';
import update from 'immutability-helper';
import getPostKey from '../utils/postKey';
import { selectPosts } from '../selectors';

/*--------- CONSTANTS ---------*/
const GET_POSTS_BEGIN = 'GET_POSTS_BEGIN';
const GET_POSTS_SUCCESS = 'GET_POSTS_SUCCESS';
const GET_POSTS_FAILURE = 'GET_POSTS_FAILURE';
const NO_MORE_POSTS = 'NO_MORE_POSTS';

/*--------- ACTIONS ---------*/
export function getPostsBegin(daysAgo) {
  return { type: GET_POSTS_BEGIN, daysAgo };
}

export function getPostsSuccess(daysAgo, posts) {
  return { type: GET_POSTS_SUCCESS, daysAgo, posts };
}

export function getPostsFailure(message) {
  return { type: GET_POSTS_FAILURE, message };
}

export function setNoMore(daysAgo) {
  return { type: NO_MORE_POSTS, daysAgo };
}

/*--------- REDUCER ---------*/
export function getPostsReducer(state, action) {
  switch (action.type) {
    case GET_POSTS_BEGIN: {
      const { category, query } = action;
      const tag = query.tag || 'all';
      // Initializing category structure
      return update(state, {
        categories: {
          [category]: {$auto: {
            [tag]: {$auto: {
              list: {$autoArray: {}},
              hasMore: {$apply: hasMore => hasMore !== false},
              isLoading: {$apply: isLoading => isLoading !== false},
            }},
          }},
        },
      });
    }
    case GET_POSTS_SUCCESS: {
      const { category, tag, posts, statePosts } = action;

      // Filtering posts already in state
      const newPosts = {};
      posts
        .filter(post => !statePosts[getPostKey(post)])
        .forEach(post => {
          newPosts[getPostKey(post)] = post;
        });

      // Appending new post ids to list
      const oldList = state.categories[category][tag].list;
      const listToPush = posts
        .filter(post => !oldList.find(postId => postId === getPostKey(post)))
        .map(post => getPostKey(post));

      return update(state, {
        posts: { $merge: newPosts },
        categories: {
          [category]: {
            [tag]: {
              list: {$push: listToPush},
              isLoading: {$set: false},
            },
          },
        },
      });
    }
    case NO_MORE_POSTS: {
      const { category, tag } = action;
      return update(state, {
        categories: {
          [category]: {
            [tag]: {
              hasMore: {$set: false},
            }
          }
        }
      });
    }
    default:
      return state;
  }
}

/*--------- SAGAS ---------*/
function* getPosts({ daysAgo }) {
  try {
    const statePosts = yield select(selectPosts());
    const posts = yield getDiscussionsFromAPI(category, query);
    const tag = query.tag || 'all';
    if (posts.length === 1) {
      yield put(setNoMore(category, tag, true));
    }
    const formattedPosts = posts.map(post => format(post));

    yield put(getPostsSuccess(category, tag, formattedPosts, statePosts));
  } catch(e) {
    yield put(getPostsFailure(e.message));
  }
}

export default function* getPostsManager() {
  yield takeEvery(GET_POSTS_BEGIN, getPosts);
}