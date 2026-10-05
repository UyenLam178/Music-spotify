import api from "./api";

export const getMyPlaylists = async () => {
    const { data } = await api.get("/playlists/me");
    return data;
};

export const getPlaylistById = async (playlistId) => {
    const { data } = await api.get(`/playlists/${playlistId}`);
    return data;
};

// CreatePlaylistRequest { name, description, isPublic }
export const createPlaylist = async ({ name, description = "", isPublic = true }) => {
    const { data } = await api.post("/playlists", { name, description, isPublic });
    return data;
};

// UpdatePlaylistRequest { name, description, isPublic, coverImageUrl }
export const updatePlaylist = async (playlistId, payload) => {
    const { data } = await api.put(`/playlists/${playlistId}`, payload);
    return data;
};

export const deletePlaylist = async (playlistId) => {
    const { data } = await api.delete(`/playlists/${playlistId}`);
    return data;
};

// AddSongToPlaylistRequest { songId }
export const addSongToPlaylist = async (playlistId, songId) => {
    const { data } = await api.post(`/playlists/${playlistId}/songs`, { songId });
    return data;
};

export const removeSongFromPlaylist = async (playlistId, songId) => {
    const { data } = await api.delete(`/playlists/${playlistId}/songs/${songId}`);
    return data;
};

export default {
    getMyPlaylists,
    getPlaylistById,
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    addSongToPlaylist,
    removeSongFromPlaylist,
};
