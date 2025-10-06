import type { IAPI } from '../appTypes/states';

/* eslint-disable @typescript-eslint/no-explicit-any */
export const startCase = (str = '', toUpper = true) => {
  const sentences = str.toLowerCase().split(' ');
  sentences.forEach((_, i) => {
    const firstChar = sentences[i].charAt(0);
    if (toUpper) {
      firstChar.toUpperCase();
    }
    sentences[i] = firstChar + sentences[i].slice(1);
  });
  return sentences.join(' ');
};

export const getSearchParams = (url = '') => {
  const paramPattern = /:\w+/g;

  return (
    url
      .match(paramPattern)
      // Remove the leading colon
      ?.map((m) => m.slice(1))
  );
};

/**
 *
 * @param url a string to be formatted
 * @param params an object of parametters to be appended to the string
 * @returns formatted string
 */
export const formatParamaterizedUrl = (
  url = '',
  params = {} as Record<string, string>,
  searchParams: string[] = []
) => {
  let endpoint = url;
  /**
   * When a @url like /employee?pageNumber=:pageNumber&search=:searchKey
   * formulated without passing the @params object like
   * {pageNumber:0, searchKey:doe}, it turns out to be an invalid url.
   * However, if the @params was not provided at all, we should send an
   * empty string in every place of a param
   * So we replace ":paramName" placeholder with an empty string
   *
   * The result would be /employee?pageNumber=&search=
   */

  searchParams.forEach((sp) => {
    endpoint = endpoint.replace(`:${sp}`, params[sp] ?? '');
  });

  return endpoint;
};

export const formulateQuery =
  ({ endpoint, verb, hasBody, isDownload }: IAPI) =>
  (args = {}) => {
    const query = {
      url: endpoint,
      method: verb,
      body: hasBody ? args : undefined,
    } as any;
    const searchParams = getSearchParams(endpoint);
    if (searchParams?.length) {
      query.url = formatParamaterizedUrl(query.url, args, searchParams);

      if (hasBody) {
        // If the API has a body, we should formulate it
        // with the remaining params
        query.body = { ...args } as Record<string, any>;
        Object.keys(args).forEach((key) => {
          if (searchParams.includes(key)) {
            delete (query.body as Record<string, any>)[key];
          }
        });
      }
    }
    if (isDownload) {
      query.cache = 'no-cache';
      query.responseHandler = async (response: any) => {
        if (!response.ok) {
          // Capture the error message from the response
          const error = await response.json();

          throw new Error(error.error || 'Failed to download file');
        }

        const blob = await response.blob();
        const contentDisposition = response.headers.get('Content-Disposition');
        let fileName = 'downloaded_file';
        if (contentDisposition) {
          const match = contentDisposition.match(/filename="(.+)"/);
          fileName = match ? match[1] : 'downloaded_file';
        }
        return { blob, fileName };
      };
    }

    return query;
  };
