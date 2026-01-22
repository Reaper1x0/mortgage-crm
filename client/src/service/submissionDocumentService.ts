import apiClient from "../api/apiClient";

export const SubmissionDocumentsService = {
  list: async (submissionId: string) => {
    const resp = await apiClient.get(`/submissions/${submissionId}/documents`);
    return resp.data?.data; // { documents }
  },

  replace: async (submissionId: string, docEntryId: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);

    const resp = await apiClient.put(
      `/submissions/${submissionId}/documents/${docEntryId}`,
      fd,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return resp.data?.data; // { submission, replaced, warnings }
  },

  remove: async (submissionId: string, docEntryId: string) => {
    const resp = await apiClient.delete(
      `/submissions/${submissionId}/documents/${docEntryId}`
    );
    return resp.data; // { submission, deleted, warnings }
  },
};
